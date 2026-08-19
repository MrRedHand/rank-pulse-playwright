import { Outlet } from 'react-router-dom'
import { Sidebar } from './components/sidebar'
import styles from './App.module.css'

function App() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

export default App
