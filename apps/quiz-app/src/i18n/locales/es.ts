/**
 * es.ts — cadenas de UI en español.
 * El tipo ancla el conjunto de claves del zh (Record<TKey, string>): falta una clave y el compilador falla.
 */
import type { TKey } from './zh';

export const es: Record<TKey, string> = {
  // Global
  'app.title': 'AI Study Kit · Práctica',
  'app.loading': 'Cargando progreso…',

  // Navegación superior
  'nav.quiz': 'Práctica',
  'nav.flashcards': 'Tarjetas',
  'nav.courses': 'Cursos',
  'nav.backHome': 'Volver al inicio',

  // Inicio
  'home.tagline': 'Sitio de práctica · {total} preguntas · el progreso se sincroniza entre dispositivos',
  'home.taglineLocal': 'Sitio de práctica · {total} preguntas · el progreso se guarda en este navegador',
  'home.statAnswered': 'Respondidas',
  'home.statAccuracy': 'Precisión',
  'home.statWrong': 'Erróneas',
  'home.statRead': 'Leídas',
  'home.resume': 'Último tema',
  'home.resumeGo': 'Continuar →',
  'home.wrongRetry': 'Repetir erróneas ({n})',
  'home.random20': '{n} al azar',
  'home.byTopic': 'Practicar por tema (clic en un tema para ver subtemas)',
  'home.progressManage': 'Gestión del progreso',
  'home.coverDetail': 'Cobertura respondida (por punto de examen)',
  'home.uncategorized': '(Sin clasificar)',
  'home.other': 'Otros',
  'home.resetPos': 'Restablecer posiciones',
  'home.confirmResetPos':
    '¿Volver todas las listas de práctica (por día/tema) a la pregunta 1? (No afecta a tus respuestas)',
  'home.resetWrong': 'Restablecer erróneas',
  'home.confirmResetWrong':
    '¿Vaciar todo el registro de erróneas? (La práctica de erróneas se quedará sin preguntas; no se puede deshacer)',
  'home.resetRead': 'Restablecer lecturas',
  'home.confirmResetRead':
    '¿Vaciar el progreso de lectura? (No afecta a tus respuestas; no se puede deshacer)',
  'home.resetAll': 'Vaciar todo el progreso',
  'home.confirmResetAll':
    '¿Vaciar TODO el progreso (respuestas + erróneas + lecturas)? No se puede deshacer y se sincronizará con todos tus dispositivos.',

  // Práctica
  'practice.readMode': 'Modo lectura',
  'practice.layerAll': 'Todos',
  'practice.redoSet': 'Rehacer esta serie',
  'practice.redoSetTitle': 'Borrar las respuestas de esta serie y rehacerla',
  'practice.jumpUnanswered': 'Ir a sin responder',
  'practice.jumpUnansweredTitle': 'Saltar a la primera pregunta sin responder de la serie',
  'practice.rereadSet': 'Releer esta serie',
  'practice.rereadSetTitle': 'Borrar el progreso de lectura de esta serie y releerla',
  'practice.viewPractice': 'Practicar',
  'practice.viewRead': 'Leer',
  'practice.mastered': 'Dominadas {n}',
  'practice.readCount': 'Leídas {n}',
  'practice.answeredCount': 'Respondidas {n}',
  'practice.noWrong': '¡Aún no hay preguntas erróneas, ve a responder algunas!',
  'practice.noQuestionsScope': 'No hay preguntas en «{name}».',
  'practice.noQuestions': 'No hay preguntas.',
  'practice.backHome': 'Volver al inicio',
  'practice.prev': 'Anterior',
  'practice.next': 'Siguiente',
  'practice.finish': 'Terminar',
  'practice.backToFirst': 'Volver a la primera',
  'practice.nextSet': 'Siguiente serie: {label}',
  'practice.stayHere': 'Quedarme aquí (cerrar)',
  'practice.keepReading': 'Seguir leyendo (cerrar)',
  'practice.labelWrong': 'Erróneas',
  'practice.labelSequential': 'Práctica secuencial',
  'practice.labelQuoted': '«{name}»',
  'practice.confirmRedo':
    '¿Restablecer las respuestas de {label}? ({n} preguntas, incluye aciertos/errores y progreso de erróneas. No se puede deshacer. No afecta a otros temas ni a las tarjetas.)',
  'practice.confirmReread':
    '¿Releer {label}? ({n} preguntas; borra el progreso de lectura de esta serie. No se puede deshacer. No afecta a las respuestas.)',
  'practice.summaryAria': 'Resumen de práctica',

  // Tarjeta de pregunta
  'q.multi': 'Opción múltiple',
  'q.judge': 'Verdadero/Falso',
  'q.single': 'Opción única',
  'q.difficulty': 'Dificultad {level}',
  'q.index': 'Pregunta {n}',
  'q.imageAlt': 'Imagen de la pregunta',
  'q.submitSelfEval': 'Enviar (autoevaluada)',
  'q.submit': 'Enviar',
  'q.correct': '¡Correcto!',
  'q.wrong': 'Incorrecto. Respuesta correcta: {answer}',
  'q.wrongCountHistory': '· fallada {n} veces antes',
  'q.wrongCountTotal': '· {n} fallos en total',
  'q.streakProgress': '{streak}/{needed} aciertos seguidos: {left} más y sale del registro de erróneas',
  'q.mastered': 'Dominada: sale del registro de erróneas',
  'q.dismiss': 'Quitar',
  'q.dismissTitle': 'Quitar del registro de erróneas (deja de repetirse)',
  'q.confirmDismiss': '¿Quitar esta pregunta del registro de erróneas?',
  'q.selfEvalNote': 'Autoevaluada (sin respuesta canónica)',
  'q.analysis': 'Explicación:',
  'opt.correctAnswer': 'Respuesta correcta',

  // Diálogo de confirmación
  'confirm.cancel': 'Cancelar',
  'confirm.ok': 'Aceptar',
  'confirm.aria': 'Confirmar acción',

  // Valoración SRS
  'srs.again': 'Repetir',
  'srs.hard': 'Difícil',
  'srs.good': 'Bien',
  'srs.easy': 'Fácil',
  'srs.aria': 'Valorar',

  // Resumen de práctica
  'summary.tierGood': 'Bien dominado',
  'summary.tierOk': 'Sigue así',
  'summary.tierLow': 'Practica más',
  'summary.title': 'Práctica completada · {title}',
  'summary.answered': 'Respondidas',
  'summary.correctCount': 'Aciertos',
  'summary.wrongCount': 'Errores',
  'summary.selfRated': 'Incluye {n} autoevaluadas (no cuentan para la precisión)',
  'summary.totalNote': '{n} preguntas · precisión acumulada del tema',
  'summary.backHome': 'Inicio',
  'summary.redo': 'Rehacer serie',

  // Repaso de tarjetas
  'fc.extraDone': '¡Práctica extra completada!',
  'fc.extraDoneNote': 'Repasaste {n} tarjetas más; valoraciones guardadas',
  'fc.back': 'Volver a tarjetas',
  'fc.todayDone': '¡Repaso de hoy completado!',
  'fc.todayDoneNote': 'Hoy repasaste {n} tarjetas',
  'fc.streak': 'Racha de {n} días',
  'fc.nextDue': 'Próxima tarjeta en {interval}',
  'fc.learningLaterToday': '{n} tarjetas en aprendizaje vencen más tarde hoy; vuelve entonces',
  'fc.extraRound': 'Otra ronda (repaso extra, no actualiza la racha)',
  'fc.new': 'Nuevas',
  'fc.learning': 'Aprendiendo',
  'fc.review': 'Pendientes',
  'fc.includesRelearn': '· {n} repasos extra',
  'fc.extraTag': '· práctica extra',
  'fc.phaseNew': 'Nueva',
  'fc.phaseLearning': 'Aprendizaje {cur}/{total}·{step}m',
  'fc.phaseRelearning': 'Reaprendizaje·{step}m',
  'fc.phaseReview': 'Repaso',
  'fc.hintFlip': 'Toca la tarjeta o pulsa Espacio para girarla',
  'fc.hintRate': 'Valora abajo (o pulsa 1-4)',
  'fc.showAnswer': 'Mostrar respuesta',

  // Panel de tarjetas
  'fch.title': 'Repaso de tarjetas',
  'fch.tagline': 'Repetición espaciada · contra el olvido · {n} tarjetas',
  'fch.todayDone': 'El repaso de hoy está listo',
  'fch.start': 'Empezar el repaso de hoy',
  'fch.count': '({n} tarjetas)',
  'fch.nothingToday': 'Hoy no hay tarjetas pendientes',
  'fch.rerunAll': 'Practicar las {n} tarjetas',
  'fch.rerunNote': 'Práctica extra · no actualiza la racha · las valoraciones sí se guardan',
  'fch.newPerDay': 'Nuevas tarjetas por día',
  'fch.save': 'Guardar',
  'fch.cancel': 'Cancelar',
  'fch.resetAllSrs': 'Restablecer todo el progreso de tarjetas ({n} vuelven a nuevas)',
  'fch.confirmResetSrs':
    '¿Vaciar todo el progreso de tarjetas? Todas vuelven a estado nuevo y la racha se pone a cero. No se puede deshacer. (No afecta a respuestas ni lecturas)',

  // Cursos
  'courses.notReady': 'Cursos no disponibles',
  'courses.notReadyHint':
    'El contenido viene de examples/<theme>/ — ejecuta pnpm run build (incluye sync:study) para sincronizarlo en public/study/.',
  'courses.frameTitle': 'Sitio del curso',
  'courses.index': 'Índice de lecciones',
  'courses.readProgress': 'Leídas {read}/{total}',

  // Aviso de sincronización
  'sync.local': 'Modo demo: el progreso se guarda solo en este navegador, sin sincronización',
  'sync.retrying': 'Reintentando sincronización…',
  'sync.error': 'Falló la sincronización: guardado localmente. Toca para reintentar.',
  'sync.retry': 'Reintentar',
  'sync.close': 'Cerrar',

  // Tema claro/oscuro
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',
  'theme.title': 'Actual: {label} (clic para cambiar)',
  'theme.aria': 'Cambiar tema, actual: {label}',

  // Panel de ajustes (preferencias de estudio)
  'settings.title': 'Preferencias de Estudio',
  'settings.close': 'Cerrar',
  'settings.extLabel': 'Ejercicios Ampliados',
  'settings.extDesc': 'Desactivado por defecto. Activado = mostrar la capa ampliada (preguntas por capítulo): filtro de capa en práctica, bloques en la página principal — para reforzar temas débiles',
  'settings.autoLabel': 'Avance Automático al Aciertar',
  'settings.autoDesc': 'Activado por defecto. Salta a la siguiente pregunta 3 s tras acertar; desactivado = quedarse a leer la explicación',
  'settings.quotaLabel': 'Nuevas Tarjetas al Día',
  'settings.quotaDesc': 'Máximo de tarjetas nuevas por día (0-50), sincronizado con la página de tarjetas',
  'settings.quotaMinus': 'Reducir límite',
  'settings.quotaPlus': 'Aumentar límite',
  'settings.syncHint': 'Las preferencias se sincronizan entre dispositivos con tu progreso',

  // Cambio de idioma
  'lang.aria': 'Cambiar idioma',
  'lang.title': 'Idioma',
};
