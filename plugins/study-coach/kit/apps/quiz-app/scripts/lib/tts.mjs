/**
 * tts.mjs — TTS（语音合成）抽象层。
 *
 * 当前只实现 GLM-TTS adapter（智谱）。接口预留，后续可加 OpenAI / ElevenLabs / Azure 等。
 *
 * 用户在 .env 配：
 *   TTS_PROVIDER=glm-tts                      （默认，可省略）
 *   GLM_TTS_API_KEY=your-key
 *   TTS_MALE_VOICE=taojiannan                  （男声，默认值见下）
 *   TTS_FEMALE_VOICE=byella                    （女声，默认值见下）
 *
 * 抽象接口：
 *   synthesize({ text, voice, speed }) → { audio: Buffer, format: 'mp3'|'wav' }
 *
 * 各 adapter 实现这个接口。podcast-generate.mjs 调 synthesize 把对话脚本合成音频。
 */

const DEFAULT_PROVIDER = 'glm-tts';

// GLM-TTS 默认音色（API 文档：https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts）
// 用 generic 'male' / 'female' 兜底（API 支持），具体音色 ID 在 .env 覆盖
// 可选音色名：彤彤（默认）/ 小陈 / 锤锤 / jam / kazi / douji / luodo
const GLM_DEFAULT_MALE = 'male';
const GLM_DEFAULT_FEMALE = 'female';

/**
 * 校验 TTS 配置完整。缺失时打印清晰提示并退出。
 */
export function requireTtsConfig() {
  const provider = process.env.TTS_PROVIDER || DEFAULT_PROVIDER;
  if (provider === 'glm-tts') {
    const apiKey = process.env.GLM_TTS_API_KEY || process.env.LLM_API_KEY;
    if (!apiKey) {
      console.error('❌ TTS 配置不完整。请在 .env 配：');
      console.error('   TTS_PROVIDER=glm-tts  (默认，可省略)');
      console.error('   GLM_TTS_API_KEY=your-key');
      console.error('   TTS_MALE_VOICE=male                (可选，默认值已给)');
      console.error('   TTS_FEMALE_VOICE=female            (可选，默认值已给)');
      process.exit(1);
    }
    return { provider, apiKey };
  }
  // 其他 provider（OpenAI/ElevenLabs 等）将后续添加
  console.error(`❌ TTS_PROVIDER=${provider} 暂不支持。当前支持：glm-tts`);
  process.exit(1);
}

/**
 * 合成一段语音。
 *
 * @param {object} params
 * @param {string} params.text  要合成的文本
 * @param {'male'|'female'} [params.gender='male']  选男声 / 女声
 * @param {number} [params.speed=1.0]  语速倍率（0.5-2.0）
 * @returns {Promise<{audio: Buffer, format: 'mp3'|'wav'}>}
 */
export async function synthesize({ text, gender = 'male', speed = 1.0 }) {
  const { provider, apiKey } = requireTtsConfig();

  if (provider === 'glm-tts') {
    return synthGLM({ text, gender, speed, apiKey });
  }
  throw new Error(`TTS provider ${provider} 未实现`);
}

/**
 * GLM-TTS adapter。
 *
 * 调智谱 GLM 的 TTS API（OpenAI 兼容协议，baseURL 不同）。
 * 文档：https://open.bigmodel.cn/dev/api/audio/tts
 *
 * 单独抽出方便测试时 mock。
 */
/** 单例 GLM client（与 llm.mjs 同模式——避免每段对话 new 一个 client）。 */
let _glmClient = null;
async function getGLMClient(apiKey) {
  if (_glmClient) return _glmClient;
  const OpenAI = (await import('openai')).default;
  _glmClient = new OpenAI({
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey,
    maxRetries: 3,
  });
  return _glmClient;
}

async function synthGLM({ text, gender, speed, apiKey }) {
  const voice = gender === 'female'
    ? (process.env.TTS_FEMALE_VOICE || GLM_DEFAULT_FEMALE)
    : (process.env.TTS_MALE_VOICE || GLM_DEFAULT_MALE);

  const client = await getGLMClient(apiKey);

  // GLM-TTS API（OpenAI 兼容 audio.speech 接口）
  // 文档：https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts
  const response = await client.audio.speech.create({
    model: 'glm-tts',
    voice,
    input: text,
    speed: speed ?? 1.0,
    response_format: 'wav',
  });

  const audio = Buffer.from(await response.arrayBuffer());
  return { audio, format: 'wav' };
}

/**
 * 把多段对话脚本合成一个连续音频文件。
 *
 * 注意：WAV 简单拼接在多数播放器能播（每个 WAV 自带 header，播放器会按顺序读），
 * 但不是无缝——段间会有微小间断。要做无缝可引入 ffmpeg 拼接。
 *
 * @param {Array<{speaker: 'male'|'female', text: string}>} segments
 * @returns {Promise<{audio: Buffer, format: 'wav'}>}
 */
export async function synthesizeDialog(segments) {
  const parts = [];
  for (const seg of segments) {
    const { audio } = await synthesize({
      text: seg.text,
      gender: seg.speaker === 'female' ? 'female' : 'male',
    });
    parts.push(audio);
  }
  const combined = Buffer.concat(parts);
  return { audio: combined, format: 'wav' };
}
