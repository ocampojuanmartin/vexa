export type Locale = 'en' | 'es'

export const locales: Record<Locale, Record<string, string>> = {
  en: {
    // Auth
    'auth.login': 'Sign in',
    'auth.register': 'Create account',
    'auth.logout': 'Sign out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full name',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.resetPassword': 'Reset password',
    'auth.resetSent': 'Check your email for a password reset link.',
    'auth.registerSuccess': 'Check your email to confirm your account.',
    'auth.signInWith': 'Sign in to Vexa',
    'auth.createAccount': 'Create your account',
    'auth.resetYourPassword': 'Reset your password',
    'auth.tagline': 'Your practice, streamlined',

    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.matters': 'Matters',
    'nav.timeTracking': 'Time tracking',
    'nav.expenses': 'Expenses',
    'nav.timesheets': 'Timesheets',
    'nav.stats': 'Stats',
    'nav.settings': 'Settings',
    'nav.users': 'Users',

    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.hoursThisMonth': 'Hours this month',
    'dashboard.activeMatters': 'Active matters',
    'dashboard.pendingTimesheets': 'Pending timesheets',
    'dashboard.overduePayments': 'Overdue payments',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.noResults': 'No results found',
    'common.error': 'Something went wrong',
  },
  es: {
    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.register': 'Crear cuenta',
    'auth.logout': 'Cerrar sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.fullName': 'Nombre completo',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.noAccount': '¿No tenés cuenta?',
    'auth.hasAccount': '¿Ya tenés cuenta?',
    'auth.resetPassword': 'Restablecer contraseña',
    'auth.resetSent': 'Revisá tu correo para el enlace de restablecimiento.',
    'auth.registerSuccess': 'Revisá tu correo para confirmar tu cuenta.',
    'auth.signInWith': 'Ingresá a Vexa',
    'auth.createAccount': 'Creá tu cuenta',
    'auth.resetYourPassword': 'Restablecé tu contraseña',
    'auth.tagline': 'Tu estudio, simplificado',

    // Sidebar
    'nav.dashboard': 'Panel',
    'nav.clients': 'Clientes',
    'nav.matters': 'Asuntos',
    'nav.timeTracking': 'Horas',
    'nav.expenses': 'Gastos',
    'nav.timesheets': 'Timesheets',
    'nav.stats': 'Estadísticas',
    'nav.settings': 'Configuración',
    'nav.users': 'Usuarios',

    // Dashboard
    'dashboard.welcome': 'Bienvenido',
    'dashboard.hoursThisMonth': 'Horas este mes',
    'dashboard.activeMatters': 'Asuntos activos',
    'dashboard.pendingTimesheets': 'Timesheets pendientes',
    'dashboard.overduePayments': 'Pagos vencidos',

    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.loading': 'Cargando...',
    'common.noResults': 'No se encontraron resultados',
    'common.error': 'Algo salió mal',
  },
}
