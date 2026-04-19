import React, { useEffect, useRef, useState, useCallback } from 'react';
import { message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { getComments, createComment, deleteComment } from '@/services/comment';
import styles from './index.less';

interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
}

/** 每条留言的动画参数（随机生成一次，固定在整个生命周期） */
interface BubbleConfig {
  id: number;
  content: string;
  left: number; // vw
  top: number; // vh
  delay: number; // s
  duration: number; // s
  fontSize: number; // px
}

function buildConfigs(list: CommentItem[]): BubbleConfig[] {
  return list.map((item) => ({
    id: item.id,
    content: item.content,
    left: Math.random() * 80 + 5, // 5~85vw
    top: Math.random() * 70 + 10, // 10~80vh
    delay: Math.random() * 6, // 0~6s 错落
    duration: Math.random() * 3 + 4, // 4~7s 每轮
    fontSize: Math.random() * 6 + 16, // 16~22px
  }));
}

const CommentPage: React.FC = () => {
  const isAdmin = localStorage.getItem('token') === '121414';

  const [bubbles, setBubbles] = useState<BubbleConfig[]>([]);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await getComments();
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
      await createComment({ content });
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
            style={{
              left: `${b.left}vw`,
              top: `${b.top}vh`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              fontSize: `${b.fontSize}px`,
            }}
          >
            <span className={styles['bubble-text']}>{b.content}</span>
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
