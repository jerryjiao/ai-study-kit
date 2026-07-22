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

// GLM-TTS 默认音色（如不匹配你的账号权限，请在 .env 覆盖）
// 这两个是公开文档里常见的通用音色；具体可用音色列表见
// https://open.bigmodel.cn/dev/api/audio/tts
const GLM_DEFAULT_MALE = 'taojiannan';
const GLM_DEFAULT_FEMALE = 'byella';

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
      console.error('   TTS_MALE_VOICE=taojiannan        (可选，默认值已给)');
      console.error('   TTS_FEMALE_VOICE=byella          (可选，默认值已给)');
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
async function synthGLM({ text, gender, speed, apiKey }) {
  // 动态 import OpenAI（避免顶层 import 让纯逻辑测试更快）
  const OpenAI = (await import('openai')).default;

  const voice = gender === 'female'
    ? (process.env.TTS_FEMALE_VOICE || GLM_DEFAULT_FEMALE)
    : (process.env.TTS_MALE_VOICE || GLM_DEFAULT_MALE);

  const client = new OpenAI({
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey,
    maxRetries: 3,
  });

  // GLM TTS 使用 OpenAI 兼容的 audio.speech.create 接口
  const response = await client.audio.speech.create({
    model: 'cogtts',
    voice,
    input: text,
    // GLM 不支持 speed 参数时会被忽略，不影响
    response_format: 'mp3',
  });

  const audio = Buffer.from(await response.arrayBuffer());
  return { audio, format: 'mp3' };
}

/**
 * 把多段对话脚本合成一个连续音频文件。
 *
 * @param {Array<{speaker: 'male'|'female', text: string}>} segments
 * @returns {Promise<{audio: Buffer, format: 'mp3'}>}
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
  // 简单拼接（mp3 帧拼接，多数播放器能播；要做无缝可引入 ffmpeg）
  const combined = Buffer.concat(parts);
  return { audio: combined, format: 'mp3' };
}
