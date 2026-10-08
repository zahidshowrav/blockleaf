import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library's automatic cleanup is not
// registered. Without this, each test sees the previous test's DOM still
// mounted and `document`-wide queries silently assert against the wrong node.
afterEach(cleanup);
