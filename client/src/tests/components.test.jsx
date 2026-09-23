/**
 * Frontend Component Unit Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

describe('UI Design System Components', () => {
  it('renders Button correctly and handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Button in loading state with spinner and disabled behavior', () => {
    render(<Button isLoading>Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders Badge with correct variant styling', () => {
    render(<Badge variant="success">Active Status</Badge>);

    const badge = screen.getByText('Active Status');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('text-emerald-700');
  });

  it('renders LoadingSpinner with accessible role', () => {
    render(<LoadingSpinner label="Fetching data..." />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('renders Card with header and content', () => {
    render(
      <Card>
        <CardHeader title="Card Title" subtitle="Card Subtitle" />
        <CardContent>
          <p>Card body content</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });
});
