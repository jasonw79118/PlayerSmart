import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Explicit cleanup also covers render helpers imported by the shared setup.
afterEach(cleanup)
