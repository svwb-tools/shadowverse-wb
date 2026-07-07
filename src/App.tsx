import { useState } from 'react'
import { Editor } from './components/Editor'
import { Home } from './components/Home'

type View = { screen: 'home' } | { screen: 'editor'; tableId: string }

export default function App() {
  const [view, setView] = useState<View>({ screen: 'home' })

  if (view.screen === 'editor') {
    return <Editor tableId={view.tableId} onBack={() => setView({ screen: 'home' })} />
  }
  return <Home onOpen={(tableId) => setView({ screen: 'editor', tableId })} />
}
