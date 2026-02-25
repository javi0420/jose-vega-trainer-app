import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SummaryHeader from '../components/summary/SummaryHeader.jsx'

describe('SummaryHeader', () => {
    it('formats duration correctly (hours and minutes)', () => {
        render(<SummaryHeader workoutName="Test" date={new Date()} durationSeconds={3665} totalVolume={0} />)
        // 3665s = 1h 1m 5s -> "1h 1m"
        expect(screen.getByText('1h 1m')).toBeDefined()
    })

    it('formats duration correctly (minutes only)', () => {
        render(<SummaryHeader workoutName="Test" date={new Date()} durationSeconds={125} totalVolume={0} />)
        // 125s = 2m 5s -> "2m"
        expect(screen.getByText('2m')).toBeDefined()
    })

    it('displays PR badge when volume is high (Positive logic)', () => {
        render(<SummaryHeader workoutName="Test" totalVolume={6000} />)
        expect(screen.getByText('¡Excelente Trabajo!')).toBeDefined()
    })

    it('hides PR badge when volume is low (Negative logic)', () => {
        render(<SummaryHeader workoutName="Test" totalVolume={100} />)
        expect(screen.queryByText('¡Excelente Trabajo!')).toBeNull()
    })

    it('formats volume in tons', () => {
        render(<SummaryHeader workoutName="Test" totalVolume={2500} />)
        // 2500kg -> 2.5 ton
        expect(screen.getByText('2.5')).toBeDefined()
    })
})
