import { Amplify } from 'aws-amplify'
import { I18n } from 'aws-amplify/utils'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
    },
  },
})

I18n.putVocabulariesForLanguage('ja', {
  'Sign In': 'ログイン',
  'Sign Up': 'アカウント作成',
  'Sign Out': 'ログアウト',
  'Email': 'メールアドレス',
  'Password': 'パスワード',
  'Confirm Password': 'パスワード（確認）',
  'Enter your Email': 'メールアドレスを入力',
  'Enter your Password': 'パスワードを入力',
  'Forgot your password?': 'パスワードをお忘れですか？',
  'Reset Password': 'パスワードリセット',
  'Submit': '送信',
  'Confirm': '確認',
  'Back to Sign In': 'ログインに戻る',
  'Send code': 'コードを送信',
  'Resend Code': 'コードを再送信',
  'Confirmation Code': '確認コード',
  'New Password': '新しいパスワード',
  'Create Account': 'アカウントを作成',
  'Have an account? ': 'アカウントをお持ちの方は ',
  'No account? ': 'アカウントをお持ちでない方は ',
  'Signing in': 'ログイン中...',
  'Creating Account': 'アカウント作成中...',
})
I18n.setLanguage('ja')
