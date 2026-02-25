import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import GlobalRestTimerModal from '../components/GlobalRestTimerModal'

describe('GlobalRestTimerModal', () => {
    const mockOnApply = vi.fn()
    const mockOnClose = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders with default value when open', async () => {
        render(
            <GlobalRestTimerModal
                isOpen={true}
                onClose={mockOnClose}
                onApply={mockOnApply}
                currentDefault={60}
            />
        )

        expect(await screen.findByText('Descanso Global')).toBeDefined()
        // Default 60s -> 01:00
        expect(screen.getByText('01')).toBeDefined()
        expect(screen.getByText('00')).toBeDefined()
    })

    it('adjusts minutes with + / - buttons', async () => {
        render(
            <GlobalRestTimerModal
                isOpen={true}
                onClose={mockOnClose}
                onApply={mockOnApply}
                currentDefault={60}
            />
        )

        const plusMin = screen.getByTestId('timer-min-plus')
        const minusMin = screen.getByTestId('timer-min-minus')

        fireEvent.click(plusMin)
        await waitFor(() => {
            expect(screen.getByText('02')).toBeDefined()
        })

        fireEvent.click(minusMin)
        fireEvent.click(minusMin)
        await waitFor(() => {
            // Minutes and seconds might both be "00"
            const zeros = screen.getAllByText('00')
            expect(zeros.length).toBeGreaterThanOrEqual(1)
        })
    })

    it('adjusts seconds by 15s steps', async () => {
        render(
            <GlobalRestTimerModal
                isOpen={true}
                onClose={mockOnClose}
                onApply={mockOnApply}
                currentDefault={60}
            />
        )

        const plusSec = screen.getByTestId('timer-sec-plus')
        const minusSec = screen.getByTestId('timer-sec-minus')

        fireEvent.click(plusSec)
        await waitFor(() => {
            expect(screen.getByText('15')).toBeDefined()
        })

        fireEvent.click(minusSec)
        fireEvent.click(minusSec)
        await waitFor(() => {
            expect(screen.getByText('45')).toBeDefined()
        })
    })

    it('selects time via presets', async () => {
        render(
            <GlobalRestTimerModal
                isOpen={true}
                onClose={mockOnClose}
                onApply={mockOnApply}
                currentDefault={60}
            />
        )

        const preset30 = screen.getByText('30s')
        fireEvent.click(preset30)

        await waitFor(() => {
            expect(screen.getByText('00')).toBeDefined()
            expect(screen.getByText('30')).toBeDefined()
        })
    })

    it('calls onApply with correct total seconds', async () => {
        render(
            <GlobalRestTimerModal
                isOpen={true}
                onClose={mockOnClose}
                onApply={mockOnApply}
                currentDefault={60}
            />
        )

        // Set to 2m 30s
        const plusMin = screen.getByTestId('timer-min-plus')
        fireEvent.click(plusMin) // 1 -> 2

        const plusSec = screen.getByTestId('timer-sec-plus')
        fireEvent.click(plusSec) // 0 -> 15
        fireEvent.click(plusSec) // 15 -> 30

        const applyBtn = screen.getByTestId('timer-apply-all')
        fireEvent.click(applyBtn)

        await waitFor(() => {
            expect(mockOnApply).toHaveBeenCalledWith(150) // 2*60 + 30
            expect(mockOnClose).toHaveBeenCalled()
        })
    })
})
