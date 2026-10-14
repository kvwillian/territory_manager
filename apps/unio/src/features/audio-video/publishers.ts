import { collection, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import type { RosterField } from './roster'

export type CongregationPublisher = {
  id: string
  name: string
  privilege: string
  pioneer: string
  indicador: boolean
  microfone: boolean
  som: boolean
}

export function publisherCaption(publisher: CongregationPublisher) {
  const duties = [
    publisher.indicador ? 'Indicador' : '',
    publisher.microfone ? 'Microfone' : '',
    publisher.som ? 'Som' : '',
  ].filter(Boolean)
  return duties.join(' · ')
}

export function qualifiesFor(publisher: Pick<CongregationPublisher, 'indicador' | 'microfone' | 'som'>, field: RosterField) {
  if (field === 'attendants') return publisher.indicador
  if (field === 'microphones') return publisher.microfone || publisher.som
  return publisher.som
}

export async function loadCongregationPublishers(congregationId: string) {
  const snapshot = await getDocs(query(collection(db, 'publishers'), where('congregationId', '==', congregationId)))
  return snapshot.docs
    .map((item) => {
      const data = item.data()
      return {
        id: item.id,
        name: typeof data.name === 'string' ? data.name.trim() : '',
        privilege: typeof data.privilege === 'string' ? data.privilege : 'publisher',
        pioneer: typeof data.pioneer === 'string' ? data.pioneer : 'none',
        indicador: data.indicador === true,
        microfone: data.microfone === true,
        som: data.som === true,
      }
    })
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function usePublishers(congregationId: string | null) {
  const [publishers, setPublishers] = useState<CongregationPublisher[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!congregationId) {
      setPublishers([])
      setStatus('ready')
      return
    }
    let active = true
    setStatus('loading')
    loadCongregationPublishers(congregationId).then(
      (items) => {
        if (!active) return
        setPublishers(items)
        setStatus('ready')
      },
      () => {
        if (active) setStatus('error')
      },
    )
    return () => {
      active = false
    }
  }, [congregationId])

  return { publishers, status }
}
