import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Shared sensors for sortable lists.
 * - PointerSensor covers both mouse and touch (with a small activation
 *   distance so taps/clicks don't accidentally start a drag).
 * - KeyboardSensor makes reordering accessible via arrow keys.
 */
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}
