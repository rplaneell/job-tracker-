import { render, screen } from '@testing-library/react';
import { App } from './App';

// jsdom has no WebGL, so the 3D scene is replaced by a stub in unit tests.
// Real rendering is covered by the Playwright end to end test.
vi.mock('@/scene/canvas/SceneRoot', () => ({
  SceneRoot: () => <div data-testid="scene-stub" />,
}));

describe('App', () => {
  it('renders the heading and the scene area', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Job HQ' })).toBeInTheDocument();
    expect(screen.getByTestId('scene-stub')).toBeInTheDocument();
  });
});
