// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ platform: 'web', bottom: 34, left: 0, right: 0, stackRoute: 'Chat', edges: [] as string[] }));
vi.mock('react-native', async () => {
  const native = await import('react-native-web');
  return { ...native, Platform: { get OS() { return boundary.platform; } } };
});
vi.mock('react-native-safe-area-context', async () => {
  const { View } = await import('react-native-web');
  return {
    useSafeAreaInsets: () => ({ top: 59, bottom: boundary.bottom, left: boundary.left, right: boundary.right }),
    SafeAreaView: (props: any) => { boundary.edges = props.edges; return <View style={props.style}>{props.children}</View>; },
  };
});
// Navigation and OS insets are boundaries; verify the options our component gives them.
vi.mock('@react-navigation/bottom-tabs', async () => {
  const { View } = await import('react-native-web');
  return { createBottomTabNavigator: () => ({
    Navigator: ({ screenOptions }: any) => <View testID="tab-bar" style={screenOptions({ route: { name: 'Discover' } }).tabBarStyle} />,
    Screen: () => null,
  }) };
});
vi.mock('@react-navigation/native-stack', async () => {
  const { View } = await import('react-native-web');
  return { createNativeStackNavigator: () => ({
    Navigator: ({ screenOptions }: any) => <View testID="stack-body" style={screenOptions?.({ route: { name: boundary.stackRoute } })?.contentStyle} />,
    Screen: () => null,
  }) };
});
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { count: 0 } }) }));
vi.mock('@expo/vector-icons/MaterialIcons', () => ({ default: () => null }));
vi.mock('../features/likes/likesApi', () => ({ likesApi: { fetchReceivedLikesCount: () => {} } }));
vi.mock('../pages/Discover', () => ({ Discover: () => null }));
vi.mock('../pages/Library', () => ({ Library: () => null }));
vi.mock('../pages/Likes', () => ({ Likes: () => null }));
vi.mock('../pages/Messages', () => ({ Messages: () => null }));
vi.mock('../pages/profile', () => ({ Profile: () => null }));
vi.mock('../pages/BookCreate', () => ({ BookCreate: () => null }));
vi.mock('../pages/BookEdit', () => ({ BookEdit: () => null }));
vi.mock('../pages/BookDetails', () => ({ BookDetails: () => null }));
vi.mock('../pages/Chat', () => ({ Chat: () => null }));
vi.mock('../pages/Matches', () => ({ Matches: () => null }));
vi.mock('../pages/OnboardingProfile', () => ({ OnboardingProfile: () => null }));
vi.mock('../pages/OnboardingBooks', () => ({ OnboardingBooks: () => null }));
vi.mock('../providers/SessionProvider', () => ({ useSession: () => ({ user: undefined }) }));

import { MainTabs } from '../routes/main-tabs.custom';
import { AppRoutes } from '../routes/app.routes';
import { AppScreen } from '../components/AppScreen';
import { TextField } from '../components/TextField';
import { SearchField } from '../components/SearchField';
import { MessageComposer } from '../components/chat/MessageComposer';

beforeEach(() => { boundary.platform = 'web'; boundary.bottom = 34; boundary.left = 0; boundary.right = 0; boundary.stackRoute = 'Chat'; boundary.edges = []; });
afterEach(cleanup);

describe('PWA safe-area ownership', () => {
  it.each([
    ['web', 34, 106, 42],
    ['web', 21, 93, 29],
    ['web', 0, 72, 8],
    ['ios', 34, 72, 8],
    ['android', 24, 72, 8],
  ])('reserves only the web home indicator (%s, bottom=%s)', (platform, bottom, height, paddingBottom) => {
    boundary.platform = String(platform); boundary.bottom = Number(bottom);
    render(<MainTabs />);
    const style = window.getComputedStyle(screen.getByTestId('tab-bar'));
    expect(parseFloat(style.height)).toBe(height);
    expect(parseFloat(style.paddingBottom)).toBe(paddingBottom);
    expect(parseFloat(style.height) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)).toBeGreaterThanOrEqual(44);
  });

  it('requests top and landscape side insets without adding the tab bar bottom again', () => {
    render(<AppScreen />);
    expect(boundary.edges).toEqual(['top', 'left', 'right']);
  });

  it('keeps native screen edges unchanged', () => {
    boundary.platform = 'ios'; render(<AppScreen />);
    expect(boundary.edges).toEqual(['top']);
  });

  it.each(['Chat', 'BookCreate', 'BookEdit', 'BookDetails', 'Matches'])('keeps the web stack body %s clear of landscape cutouts', route => {
    boundary.stackRoute = route; boundary.left = 59; boundary.right = 59;
    render(<AppRoutes />);
    const style = window.getComputedStyle(screen.getByTestId('stack-body'));
    expect(parseFloat(style.paddingLeft || '0')).toBe(59);
    expect(parseFloat(style.paddingRight || '0')).toBe(59);
    expect(parseFloat(style.paddingTop || '0')).toBe(0);
    expect(parseFloat(style.paddingBottom || '0')).toBe(0);
  });

  it.each(['Main', 'OnboardingProfile', 'OnboardingBooks'])('does not reserve side insets twice for %s', route => {
    boundary.stackRoute = route; boundary.left = 59; boundary.right = 59;
    render(<AppRoutes />);
    const style = window.getComputedStyle(screen.getByTestId('stack-body'));
    expect(parseFloat(style.paddingLeft || '0')).toBe(0);
    expect(parseFloat(style.paddingRight || '0')).toBe(0);
  });

  it('keeps native stack layout unchanged', () => {
    boundary.platform = 'ios'; boundary.left = 59; boundary.right = 59;
    render(<AppRoutes />);
    const style = window.getComputedStyle(screen.getByTestId('stack-body'));
    expect(parseFloat(style.paddingLeft || '0')).toBe(0);
    expect(parseFloat(style.paddingRight || '0')).toBe(0);
  });

  it('keeps the web chat composer above the home indicator', () => {
    render(<MessageComposer value="Oi" onChangeText={() => {}} onSend={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Mensagem' });
    expect(parseFloat(window.getComputedStyle(input.parentElement!).paddingBottom)).toBe(50);
  });

  it.each(['Nome', 'Buscar livros', 'Mensagem'])('declares at least 16px for the web input %s', name => {
    if (name === 'Nome') render(<TextField label="Nome" />);
    if (name === 'Buscar livros') render(<SearchField accessibilityLabel="Buscar livros" value="" onChangeText={() => {}} />);
    if (name === 'Mensagem') render(<MessageComposer value="" onChangeText={() => {}} onSend={() => {}} />);
    const input = screen.getByRole('textbox', { name });
    // jsdom incorrectly keeps RN Web's earlier `font: 14px ...` shorthand in
    // getComputedStyle. Check the actual matching, later font-size declaration.
    const sizes = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules)).flatMap(rule => {
      const styleRule = rule as CSSStyleRule;
      if (!styleRule.selectorText) return [];
      try { if (!input.matches(styleRule.selectorText)) return []; } catch { return []; }
      const size = styleRule.style.getPropertyValue('font-size');
      return size ? [parseFloat(size)] : [];
    });
    expect(sizes.at(-1)).toBeGreaterThanOrEqual(16);
  });
});
