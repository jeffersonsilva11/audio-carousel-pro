// Sentry Error Monitoring Configuration
// Free tier: 5K errors/month, 10K performance transactions

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
}

interface SentryBreadcrumb {
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

interface SentryError {
  message: string;
  stack?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: {
    id?: string;
    email?: string;
  };
}

class SentryService {
  private initialized = false;
  private dsn: string | null = null;
  private breadcrumbs: SentryBreadcrumb[] = [];
  private maxBreadcrumbs = 100;

  init(config: SentryConfig) {
    if (this.initialized || !config.dsn) {
      return;
    }

    this.dsn = config.dsn;
    this.initialized = true;

    // Set up global error handlers
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureException(error || new Error(String(message)), {
        tags: { source: 'window.onerror' },
        extra: { source, lineno, colno },
      });
    };

    window.onunhandledrejection = (event) => {
      this.captureException(event.reason, {
        tags: { source: 'unhandledrejection' },
      });
    };

    console.log('[Sentry] Initialized in', config.environment, 'environment');
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb) {
    this.breadcrumbs.push({
      ...breadcrumb,
      data: {
        ...breadcrumb.data,
        timestamp: new Date().toISOString(),
      },
    });

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  captureException(error: Error | unknown, context?: Partial<SentryError>) {
    if (!this.initialized || !this.dsn) {
      console.error('[Sentry] Not initialized, logging locally:', error);
      return;
    }

    const errorData: SentryError = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    };

    // Send to Sentry (simplified - in production use official SDK)
    this.sendToSentry('error', errorData);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.initialized || !this.dsn) {
      console.log(`[Sentry ${level}]`, message);
      return;
    }

    this.sendToSentry(level, { message });
  }

  setUser(user: { id?: string; email?: string } | null) {
    if (user) {
      this.addBreadcrumb({
        category: 'auth',
        message: 'User identified',
        level: 'info',
        data: { userId: user.id },
      });
    }
  }

  private async sendToSentry(level: string, data: SentryError | { message: string }) {
    try {
      // In production, this would send to Sentry's API
      // For now, we'll log to console and store in localStorage for debugging
      const event = {
        level,
        timestamp: new Date().toISOString(),
        breadcrumbs: this.breadcrumbs.slice(-20),
        ...data,
        environment: import.meta.env.MODE,
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Store recent errors locally for debugging
      const storedErrors = JSON.parse(localStorage.getItem('sentry_errors') || '[]');
      storedErrors.push(event);
      if (storedErrors.length > 50) {
        storedErrors.shift();
      }
      localStorage.setItem('sentry_errors', JSON.stringify(storedErrors));

      // If DSN is configured, send to Sentry
      if (this.dsn && this.dsn.startsWith('https://')) {
        // Parse DSN to get project info
        const dsnUrl = new URL(this.dsn);
        const projectId = dsnUrl.pathname.replace('/', '');
        const publicKey = dsnUrl.username;
        
        await fetch(`https://sentry.io/api/${projectId}/store/?sentry_key=${publicKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: crypto.randomUUID().replace(/-/g, ''),
            timestamp: new Date().toISOString(),
            platform: 'javascript',
            level,
            logger: 'javascript',
            message: 'message' in data ? data.message : undefined,
            exception: 'stack' in data && data.stack ? {
              values: [{
                type: 'Error',
                value: data.message,
                stacktrace: {
                  frames: data.stack.split('\n').map(line => ({ filename: line })),
                },
              }],
            } : undefined,
            breadcrumbs: {
              values: this.breadcrumbs.slice(-20),
            },
            request: {
              url: window.location.href,
              headers: {
                'User-Agent': navigator.userAgent,
              },
            },
            ...('tags' in data ? { tags: data.tags } : {}),
            ...('extra' in data ? { extra: data.extra } : {}),
            ...('user' in data ? { user: data.user } : {}),
          }),
        }).catch(() => {
          // Silently fail - don't cause more errors
        });
      }

      if (import.meta.env.DEV) {
        console.log(`[Sentry ${level}]`, event);
      }
    } catch (e) {
      // Silently fail
    }
  }

  // Get stored errors for debugging
  getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('sentry_errors') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredErrors() {
    localStorage.removeItem('sentry_errors');
  }
}

export const sentry = new SentryService();

// Initialize with DSN from environment
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (dsn) {
    sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    });
  } else {
    console.log('[Sentry] No DSN configured, error tracking disabled');
  }
};

// Export convenient functions
export const captureException = (error: Error | unknown, context?: Partial<SentryError>) => 
  sentry.captureException(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error') => 
  sentry.captureMessage(message, level);

export const addBreadcrumb = (breadcrumb: SentryBreadcrumb) => 
  sentry.addBreadcrumb(breadcrumb);

export const setUser = (user: { id?: string; email?: string } | null) => 
  sentry.setUser(user);
