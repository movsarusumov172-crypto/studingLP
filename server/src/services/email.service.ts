import { env } from '../config.js';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) return; // silently skip if not configured

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    console.error('[email] send failed:', err);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string): Promise<void> {
  await send(
    to,
    'Добро пожаловать в JS Infinite Trainer! 🚀',
    `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07090f;color:#eef2ff;padding:32px;border-radius:16px">
      <h1 style="color:#d6b25a;margin:0 0 8px">JS Infinite Trainer</h1>
      <p style="color:#7a8ba6;margin:0 0 24px">Бесконечный тренажёр программирования</p>

      <p>Привет! Твой аккаунт создан. Теперь прогресс синхронизируется в облаке — ни одного решения не потеряешь.</p>

      <h3 style="color:#d6b25a">Что умеет тренажёр:</h3>
      <ul style="color:#eef2ff;line-height:1.8">
        <li>7 языков: JS, Python, Go, C, C++, C#, Java</li>
        <li>Бесконечная генерация задач — не повторяется</li>
        <li>XP, серии, достижения</li>
        <li>Теория по каждому языку</li>
        <li>Спейсд репетишн для слабых тем</li>
      </ul>

      <p style="margin-top:24px;color:#7a8ba6;font-size:0.88rem">
        Этот email отправлен автоматически. Не нужно отвечать.
      </p>
    </div>
    `,
  );
}

export async function sendProActivatedEmail(to: string): Promise<void> {
  await send(
    to,
    'Pro активирован ✓',
    `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#07090f;color:#eef2ff;padding:32px;border-radius:16px">
      <h1 style="color:#d6b25a;margin:0 0 8px">Pro активирован!</h1>

      <p>Спасибо за поддержку. Твои возможности:</p>
      <ul style="color:#eef2ff;line-height:1.8">
        <li>✓ Лидерборд — соревнуйся с другими</li>
        <li>✓ Друзья и дуэли (скоро)</li>
        <li>✓ Командный режим (скоро)</li>
      </ul>

      <p>Открой приложение и нажми <strong style="color:#d6b25a">↻ Обновить план</strong> в настройках аккаунта.</p>

      <p style="margin-top:24px;color:#7a8ba6;font-size:0.88rem">
        Управление подпиской — через кнопку «Управление подпиской» в приложении.
      </p>
    </div>
    `,
  );
}
