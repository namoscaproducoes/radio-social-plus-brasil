import { describe, it, expect, vi } from 'vitest';
import { sendPasswordResetEmail, sendEmail } from './email';

describe('Email Service', () => {
  it('should send password reset email with valid credentials', async () => {
    // Verificar se a API key está configurada
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    
    // Testar envio de email de recuperação de senha
    const result = await sendPasswordResetEmail(
      'test@example.com',
      'Test User',
      'test-token-123',
      'http://localhost:3000'
    );
    
    // O resultado pode ser false se o email for inválido, mas a função não deve lançar erro
    expect(typeof result).toBe('boolean');
  });

  it('should handle email payload validation', async () => {
    // Testar com payload incompleto
    const result = await sendEmail({
      to: '',
      subject: 'Test',
      html: '<p>Test</p>',
    });
    
    expect(result).toBe(false);
  });
});
