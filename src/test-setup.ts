import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// isolate:false reuses module imports between files, so React Testing Library's
// import-time auto-cleanup may only register for the first test file.
afterEach(cleanup)
