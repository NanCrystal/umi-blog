import React, { useEffect, useRef, useState, useCallback } from 'react';
import { message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import {
  getCommentList,
  createComment,
  deleteComment,
} from '@/services/comment';
import { checkAdmin } from '@/utils/utils';
import styles from './index.less';

interface CommentItem {
  id: number;
  content: string;
  userId?: number;
  nickName?: string;
  avatarUrl?: string;
  createdAt: string;
}

/** 每条留言的动画参数（随机生成一次，固定在整个生命周期） */
interface BubbleConfig {
  id: number;
  content: string;
  left: number; // vw
  startY: number; // vh，初始出现高度
  endY: number; // vh，负值，控制上升总距离
  delay: number; // s
  duration: number; // s
  fontSize: number; // px
  color: string;
}

function buildConfigs(list: CommentItem[]): BubbleConfig[] {
  return list.map((item) => ({
    id: item.id,
    content: item.content,
    left: Math.random() * 90 + 5, // 5~95vw
    startY: Math.random() * 80 + 50, // 50~130vh，随机起始高度（部分在屏幕内，部分在底部外）
    endY: -(Math.random() * 150 + 30), // -30 ~ -180vh，上升距离越短越早消失
    delay: Math.random() * 6, // 0~6s 错落
    duration: Math.random() * 4 + 8, // 8~12s 每轮，更慢
    fontSize: Math.random() * 6 + 12, // 12~18px
    color: `hsla(${Math.floor(Math.random() * 360)}, 80%, 72%, 0.85)`,
  }));
}

const CommentPage: React.FC = () => {
  const isAdmin = checkAdmin();

  const [bubbles, setBubbles] = useState<BubbleConfig[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await getCommentList();
      const list: CommentItem[] = Array.isArray(data) ? data : data?.data || [];
      setBubbles(buildConfigs(list));
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSubmit = async () => {
    const content = input.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const currentUser = localStorage.getItem('user') || 'admin';
      await createComment({
        content,
        userId: 0,
        nickName: currentUser,
      });
      setInput('');
      message.success('留下了一句话 ✨');
      fetchList();
    } catch {
      message.error('发送失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteComment(id);
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles['comment-page']}>
      {/* 漂浮气泡 */}
      <div className={styles['bubbles-layer']}>
        {bubbles.map((b) => (
          <div
            key={b.id}
            className={styles['bubble']}
            style={
              {
                left: `${b.left}vw`,
                '--start-y': `${b.startY}vh`,
                '--end-y': `${b.endY}vh`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`,
                fontSize: `${b.fontSize}px`,
              } as React.CSSProperties
            }
          >
            <span className={styles['bubble-text']} style={{ color: b.color }}>
              {b.content}
            </span>
            {isAdmin && (
              <span
                className={styles['bubble-del']}
                onClick={() => handleDelete(b.id)}
              >
                ×
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 底部输入框 */}
      <div className={styles['input-bar']}>
        <textarea
          ref={inputRef}
          className={styles['input-field']}
          placeholder="说点什么吧..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={100}
        />
        <button
          className={`${styles['send-btn']}${
            submitting || !input.trim() ? ` ${styles['disabled']}` : ''
          }`}
          onClick={handleSubmit}
          disabled={submitting || !input.trim()}
        >
          <SendOutlined />
        </button>
      </div>
    </div>
  );
};

export default CommentPage;
