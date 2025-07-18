import React from 'react';
import { render, screen } from '../utils/testUtils';
import { ErrorBoundary } from '../../components/error/ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an unexpected error. Our team has been notified and is working to resolve this issue.')).toBeInTheDocument();
  });

  it('displays error details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText(/Error Type/)).toBeInTheDocument();
    expect(screen.getByText(/Error ID/)).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();
  });

  it('shows home button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: 'Go Home' });
    expect(homeButton).toBeInTheDocument();
  });

  it('shows reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: 'Reload Page' });
    expect(reloadButton).toBeInTheDocument();
  });

  it('shows bug report button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    const bugReportButton = screen.getByRole('button', { name: 'Report Issue' });
    expect(bugReportButton).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onErrorMock = jest.fn();
    
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
  });

  it('saves error report to localStorage', () => {
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('[]'),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'error_reports',
      expect.stringContaining('Test error')
    );
  });

  it('shows developer information in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Developer Information')).toBeInTheDocument();
    expect(screen.getByText('Error Message:')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('does not show developer information in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Developer Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

export {};