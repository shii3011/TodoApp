import { useState, useEffect, useRef } from 'react'
import type { AuthUser } from 'aws-amplify/auth'
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth'
import type { CSSProperties } from 'react'
import type { Priority, StatusFilter } from '../../types'
import { getDueDateInfo } from '../../utils/dueDate'
import { apiFetch } from '../../lib/api'
import { useError } from '../../context/ErrorContext'
import { useReadTodos, useReadTags, useKeyboardShortcuts } from '../../hooks'
import TagPanel from '../tags/TagPanel/TagPanel'
import TodoCard from '../todos/TodoCard/TodoCard'
import TodoFormComponent from '../todos/TodoForm/TodoForm'
import styles from './App.module.css'
import shared from '../shared.module.css'

interface AppProps {
  signOut?: () => void
  user?: AuthUser
}

export default function App({ signOut, user }: AppProps) {
  const { error, setError } = useError()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [showTagPanel, setShowTagPanel] = useState<boolean>(false)
  const notifiedIds = useRef<Set<string>>(new Set())

  const { todos, isLoading } = useReadTodos()
  const tags = useReadTags()

  useKeyboardShortcuts({
    onNewTodo: () => setShowForm(true),
    onEscape: () => {
      setShowForm(false)
      setShowTagPanel(false)
    },
  })

  // タグが削除されたとき tagFilter を自動クリア
  useEffect(() => {
    if (tagFilter && !tags.some(t => t.id === tagFilter)) {
      setTagFilter(null)
    }
  }, [tags, tagFilter])

  // 通知許可リクエスト
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  // ユーザー情報をDBへ同期
  useEffect(() => {
    const syncUser = async () => {
      try {
        const [attrs, session] = await Promise.all([fetchUserAttributes(), fetchAuthSession()])
        const email =
          attrs.email ??
          (session.tokens?.idToken?.payload?.email as string | undefined) ??
          user?.signInDetails?.loginId ??
          ''
        await apiFetch('/users/me', {
          method: 'PUT',
          body: JSON.stringify({ email, name: attrs.name }),
        })
      } catch { /* 同期失敗は無視 */ }
    }
    void syncUser()
  }, [])

  // 期限通知（5分ごと）
  useEffect(() => {
    const check = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      todos.forEach(todo => {
        if (todo.completed || !todo.dueDate) return
        const due = new Date(todo.dueDate)
        if (due < now && !notifiedIds.current.has(todo.id + '_over')) {
          new Notification('⚠ 期限切れ', { body: todo.title })
          notifiedIds.current.add(todo.id + '_over')
        } else if (due >= now && due <= in24h && !notifiedIds.current.has(todo.id + '_soon')) {
          const { label } = getDueDateInfo(todo.dueDate)
          new Notification('⏰ 期限が近づいています', { body: `${todo.title}（${label}）` })
          notifiedIds.current.add(todo.id + '_soon')
        }
      })
    }
    check()
    const timer = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [todos])

  const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

  const filteredTodos = todos
    .filter(todo => {
      const statusOk = filter === 'all' || (filter === 'active' ? !todo.completed : todo.completed)
      const priorityOk = priorityFilter === 'all' || todo.priority === priorityFilter
      const tagOk = !tagFilter || todo.tags.some(t => t.id === tagFilter)
      const searchOk = !searchQuery ||
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchQuery.toLowerCase())
      return statusOk && priorityOk && tagOk && searchOk
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>✓</span>
            TODO App
          </h1>
          <div className={styles.headerRight}>
            <div className={styles.stats}>
              <span className={styles.stat}>
                <strong>{stats.total}</strong>
                <span className={styles.label}>Total</span>
              </span>
              <span className={`${styles.stat} ${styles.statActive}`}>
                <strong>{stats.active}</strong>
                <span className={styles.label}>Active</span>
              </span>
              <span className={`${styles.stat} ${styles.statDone}`}>
                <strong>{stats.completed}</strong>
                <span className={styles.label}>Done</span>
              </span>
            </div>
            <div className={styles.userArea}>
              <span className={styles.userName}>{user?.signInDetails?.loginId ?? user?.username}</span>
              <button className={styles.signoutBtn} onClick={signOut}>ログアウト</button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.errorBanner} role="alert" onClick={() => setError(null)}>
            ⚠️ {error}<span className={styles.closeBtn}>×</span>
          </div>
        )}

        {/* 検索バー */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="タイトル・詳細を検索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* フィルター */}
        <div className={styles.controls}>
          <select className={styles.filterSelect} value={filter} onChange={e => setFilter(e.target.value as StatusFilter)}>
            <option value="all">すべて</option>
            <option value="active">未完了</option>
            <option value="completed">完了</option>
          </select>
          <select className={styles.filterSelect} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}>
            <option value="all">優先度：すべて</option>
            <option value="high">優先度：高</option>
            <option value="medium">優先度：中</option>
            <option value="low">優先度：低</option>
          </select>
          <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ 閉じる' : '＋ 新しいTODO'}
          </button>
        </div>

        {/* タグフィルター */}
        <div className={styles.tagFilterRow}>
          <button
            className={`${styles.tagAll}${!tagFilter ? ` ${styles.tagAllSelected}` : ''}`}
            onClick={() => setTagFilter(null)}
          >
            すべて
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`${shared.tagChip}${tagFilter === tag.id ? ` ${shared.tagChipSelected}` : ''}`}
              style={{ '--tag-color': tag.color } as CSSProperties}
              onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
            >
              {tag.name}
            </button>
          ))}
          <button className={styles.tagManageBtn} onClick={() => setShowTagPanel(v => !v)}>
            {showTagPanel ? '✕ 閉じる' : tags.length === 0 ? '＋ タグを作成' : '⚙ タグ管理'}
          </button>
        </div>

        {showTagPanel && <TagPanel />}

        {showForm && <TodoFormComponent onSuccess={() => setShowForm(false)} />}

        {/* TODOリスト */}
        {isLoading ? (
          <div className={styles.stateBox}>
            <span className={styles.spinner} />
            <p>読み込み中...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>📋</span>
            <p>TODOがありません</p>
          </div>
        ) : (
          <ul className={styles.todoList}>
            {filteredTodos.map(todo => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
