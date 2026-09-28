import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ViewStyle } from 'react-native';

/**
 * Bottom tab bar style that sits ABOVE the system navigation area instead
 * of sliding underneath it.
 *
 * The old fixed style (`height: 84`, `paddingBottom: 20`) was drawn under
 * Android 3-button navigation bars (≈48dp), so the system back/home buttons
 * covered the app's tabs. This derives the bottom padding from the real
 * system inset: 3-button nav, gesture nav, and the iOS home indicator all
 * report through `useSafeAreaInsets()`.
 *
 * The visible content block stays 54pt tall (same as the old 84-10-20
 * split); only the bottom padding grows with the system inset.
 */
export function useFloatingTabBarStyle(): ViewStyle {
  const insets = useSafeAreaInsets();
  // Floor of 12 keeps comfortable spacing on devices reporting a 0 inset.
  const bottomPad = Math.max(Math.round(insets.bottom), 12);
  return {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    height: 64 + bottomPad,
    paddingTop: 10,
    paddingBottom: bottomPad,
    shadowColor: '#3D4B64',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 12,
  };
}

/**
 * Bottom clearance for scroll content above the floating tab bar.
 * Worst case tab height is 64 + 48 (3-button nav) = 112, plus margin.
 */
export const TAB_CONTENT_CLEARANCE = 124;
