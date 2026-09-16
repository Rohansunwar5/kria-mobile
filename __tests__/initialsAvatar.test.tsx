import { render, screen, fireEvent } from '@testing-library/react-native';
import { InitialsAvatar, isSvgUrl } from '@/components/InitialsAvatar';

// SvgUri fetches the document before it renders anything, so under jest it is
// null and there is no node to assert on. Stand in a View that forwards the
// props we care about: that we chose the SVG branch, and that we wired onError.
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return { SvgUri: (props: Record<string, unknown>) => <View {...props} /> };
});

// Real URLs from api.kria.club — every seeded team logo and player photo is a
// DiceBear SVG, and React Native's <Image> cannot decode SVG. It fails silently
// to an empty box, which is why the whole tournament screen looked blank.
const DICEBEAR_TEAM = 'https://api.dicebear.com/9.x/shapes/svg?seed=JBN%20Royal%20Strikers&size=256';
const DICEBEAR_PLAYER = 'https://api.dicebear.com/9.x/avataaars/svg?seed=SiddharthPatil04&size=256';
const S3_PNG = 'https://arohance-e-commerce-assets.s3.amazonaws.com/tournament-banners/abc.png';

describe('isSvgUrl', () => {
  it('spots the SVG URLs the API actually serves', () => {
    expect(isSvgUrl(DICEBEAR_TEAM)).toBe(true);
    expect(isSvgUrl(DICEBEAR_PLAYER)).toBe(true);
    expect(isSvgUrl('https://x.test/logo.svg')).toBe(true);
    expect(isSvgUrl('https://x.test/logo.SVG?v=2')).toBe(true);
  });

  it('leaves raster URLs to the native image pipeline', () => {
    expect(isSvgUrl(S3_PNG)).toBe(false);
    expect(isSvgUrl('https://x.test/a.jpg')).toBe(false);
    expect(isSvgUrl('https://api.dicebear.com/9.x/shapes/png?seed=A')).toBe(false);
    expect(isSvgUrl(undefined)).toBe(false);
    expect(isSvgUrl('')).toBe(false);
  });
});

describe('InitialsAvatar', () => {
  it('renders an SVG logo through the SVG renderer, not <Image>', () => {
    render(<InitialsAvatar name="JBN Royal Strikers" logo={DICEBEAR_TEAM} />);
    expect(screen.getByTestId('avatar-svg')).toBeTruthy();
    expect(screen.queryByTestId('avatar-image')).toBeNull();
    expect(screen.queryByText('JR')).toBeNull();
  });

  it('still uses <Image> for a raster photo', () => {
    render(<InitialsAvatar name="Siddharth Patil" logo={S3_PNG} />);
    expect(screen.getByTestId('avatar-image')).toBeTruthy();
    expect(screen.queryByTestId('avatar-svg')).toBeNull();
  });

  it('falls back to initials when the image fails to load', () => {
    // A dead URL must degrade to initials, not to an empty box. Without this
    // the SVG bug was invisible — nothing logged, nothing rendered.
    render(<InitialsAvatar name="Siddharth Patil" logo={S3_PNG} />);
    fireEvent(screen.getByTestId('avatar-image'), 'error');
    expect(screen.getByText('SP')).toBeTruthy();
  });

  it('falls back to initials when the SVG fails to load', () => {
    render(<InitialsAvatar name="JBN Royal Strikers" logo={DICEBEAR_TEAM} />);
    fireEvent(screen.getByTestId('avatar-svg'), 'error');
    expect(screen.getByText('JR')).toBeTruthy();
  });

  it('shows initials when there is no image at all', () => {
    render(<InitialsAvatar name="Arjun Nair" />);
    expect(screen.getByText('AN')).toBeTruthy();
  });
});

// Pre-existing coverage, kept as-is.
describe('InitialsAvatar (crest basics)', () => {
  it('falls back to initials when a team has no logo', () => {
    const { getByText } = render(<InitialsAvatar name="Rally Kings" />);
    expect(getByText('RK')).toBeTruthy();
  });

  it('renders the crest instead of initials when a logo exists', () => {
    const { queryByText, getByLabelText } = render(
      <InitialsAvatar name="Rally Kings" logo="https://cdn.test/rk.png" />
    );
    expect(queryByText('RK')).toBeNull();
    expect(getByLabelText('Rally Kings')).toBeTruthy();
  });

  it('ignores a blank logo rather than rendering an empty box', () => {
    const { getByText } = render(<InitialsAvatar name="Rally Kings" logo="  " />);
    expect(getByText('RK')).toBeTruthy();
  });
});
