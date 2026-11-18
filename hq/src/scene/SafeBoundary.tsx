import { Component, type ReactNode } from 'react';

/** If something inside fails to load (a missing model, for example) it shows nothing and the rest of the office stays up. */
export class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
