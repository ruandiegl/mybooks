import { Component, type PropsWithChildren } from 'react';
import { BootSplash } from '../BootSplash';
export class BootErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <BootSplash phase="resources" fontsReady={false} issue="resource-error" /> : this.props.children;
  }
}
