import {
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: (() => Snapshot) | undefined,
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (left: Selection, right: Selection) => boolean,
): Selection {
  const instanceRef = useRef<{
    hasValue: boolean
    value: Selection | undefined
  }>({ hasValue: false, value: undefined })
  const instance = instanceRef.current

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot: Snapshot
    let memoizedSelection: Selection

    const memoizedSelector = (nextSnapshot: Snapshot) => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (
          isEqual
          && instance.hasValue
          && isEqual(instance.value as Selection, nextSelection)
        ) {
          memoizedSelection = instance.value as Selection
          return memoizedSelection
        }
        memoizedSelection = nextSelection
        return nextSelection
      }

      if (Object.is(memoizedSnapshot, nextSnapshot)) {
        return memoizedSelection
      }

      const nextSelection = selector(nextSnapshot)
      if (isEqual?.(memoizedSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return memoizedSelection
      }

      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }

    return [
      () => memoizedSelector(getSnapshot()),
      getServerSnapshot
        ? () => memoizedSelector(getServerSnapshot())
        : undefined,
    ] as const
  }, [getSnapshot, getServerSnapshot, instance, isEqual, selector])

  const selection = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection,
  )
  useEffect(() => {
    instance.hasValue = true
    instance.value = selection
  }, [instance, selection])
  useDebugValue(selection)
  return selection
}

export default { useSyncExternalStoreWithSelector }
