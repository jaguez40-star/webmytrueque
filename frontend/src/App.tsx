import { Route, Routes } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
    </Routes>
  )
}
