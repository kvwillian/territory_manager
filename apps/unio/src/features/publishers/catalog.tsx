import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockPublishers, type MockPublisher } from './mock'

type Catalog = {
  publishers: MockPublisher[]
  addPublisher: (publisher: MockPublisher) => void
  updatePublisher: (id: string, patch: Partial<MockPublisher>) => void
}

const PublishersContext = createContext<Catalog | null>(null)

export function PublishersProvider({ children }: { children: ReactNode }) {
  const [publishers, setPublishers] = useState<MockPublisher[]>(mockPublishers)
  const value = useMemo<Catalog>(() => ({
    publishers,
    addPublisher(publisher) {
      setPublishers((current) => [publisher, ...current])
    },
    updatePublisher(id, patch) {
      setPublishers((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    },
  }), [publishers])

  return <PublishersContext.Provider value={value}>{children}</PublishersContext.Provider>
}

export function usePublisherCatalog() {
  const value = useContext(PublishersContext)
  if (!value) throw new Error('PublishersProvider is missing')
  return value
}
