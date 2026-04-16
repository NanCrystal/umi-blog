import React, { useState } from 'react';
import { Input, Button, Modal } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import styles from './index.less';

const { TextArea } = Input;

interface DocItem {
  id: number;
  content: string;
  updatedAt: string;
}

const mockList: DocItem[] = [
  {
    id: 1,
    content: '内容拼命干活地方就是这里，记录一些随想和灵感碎片。',
    updatedAt: '2025.10.16 20:00',
  },
  {
    id: 2,
    content:
      '语言有时候是最笨重的东西夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。。',
    updatedAt: '2025.10.15 18:30',
  },
  {
    id: 3,
    content:
      '清晨的光线总是带着某种不真实感，像是世界还没完全醒来，你就已经站在了它的边缘。',
    updatedAt: '2025.10.14 09:12',
  },
  {
    id: 4,
    content: '一个人走路的时候，步伐会不自觉地慢下来。',
    updatedAt: '2025.10.13 21:55',
  },
  {
    id: 5,
    content:
      '把所有的未完成都搁置在某个抽屉里，等某一天有了勇气再去打开。也许那天永远不会来，但抽屉还在。',
    updatedAt: '2025.10.12 16:08',
  },
  { id: 6, content: '1223', updatedAt: '2025.10.11 11:40' },
  {
    id: 7,
    content:
      '记得那年夏天雨水特别多，路边的积水里倒映着整座城市，踩一脚，什么都碎了。',
    updatedAt: '2025.10.10 20:00',
  },
  {
    id: 8,
    content: '不是所有的遗忘都是背叛，有些只是时间太长。',
    updatedAt: '2025.10.09 14:22',
  },
  {
    id: 9,
    content: '写字这件事，是在和过去的自己对话。',
    updatedAt: '2025.10.08 08:05',
  },
  {
    id: 10,
    content:
      '夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。',
    updatedAt: '2025.10.07 23:59',
  },
  {
    id: 11,
    content: '内容拼命干活地方就是这里，记录一些随想和灵感碎片。',
    updatedAt: '2025.10.16 20:00',
  },
  {
    id: 12,
    content: '有些事情不说出来，只是因为还没到时候。等到时候了，自然就说了。',
    updatedAt: '2025.10.15 18:30',
  },
  {
    id: 13,
    content:
      '清晨的光线总是带着某种不真实感，像是世界还没完全醒来，你就已经站在了它的边缘。',
    updatedAt: '2025.10.14 09:12',
  },
  {
    id: 14,
    content: '一个人走路的时候，步伐会不自觉地慢下来。',
    updatedAt: '2025.10.13 21:55',
  },
  {
    id: 15,
    content:
      '把所有的未完成都搁置在某个抽屉里，等某一天有了勇气再去打开。也许那天永远不会来，但抽屉还在。',
    updatedAt: '2025.10.12 16:08',
  },
  {
    id: 16,
    content:
      '语言有时候是最笨重的东西夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。。',
    updatedAt: '2025.10.11 11:40',
  },
  {
    id: 17,
    content:
      '记得那年夏天雨水特别多，路边的积水里倒映着整座城市，踩一脚，什么都碎了。',
    updatedAt: '2025.10.10 20:00',
  },
  {
    id: 18,
    content: '不是所有的遗忘都是背叛，有些只是时间太长。',
    updatedAt: '2025.10.09 14:22',
  },
  {
    id: 19,
    content: '写字这件事，是在和过去的自己对话。',
    updatedAt: '2025.10.08 08:05',
  },
  {
    id: 20,
    content:
      '夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。夜晚的城市比白天诚实得多，所有的灯光都在说——我还在，我还在，我还在。留下来吧，多待一会。',
    updatedAt: '2025.10.07 23:59',
  },
];

// 生成当前时间字符串
const getNow = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
    2,
    '0',
  )}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const DocumentPage: React.FC = () => {
  const isAdmin = localStorage.getItem('token') === '121414';

  const [list, setList] = useState<DocItem[]>(mockList);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  // 新增输入框
  const [newContent, setNewContent] = useState('');

  // 开始编辑
  const handleEdit = (item: DocItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  // 保存编辑
  const handleSave = (id: number) => {
    if (!editContent.trim()) return;
    setList((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, content: editContent.trim(), updatedAt: getNow() }
          : item,
      ),
    );
    setEditingId(null);
    setEditContent('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 删除
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: null,
      icon: null,
      content: '确认删除该条内容？',
      okText: '确认删除',
      cancelText: '取消',
      onOk: () => {
        setList((prev) => prev.filter((item) => item.id !== id));
      },
    });
  };

  // 新增
  const handleAdd = () => {
    if (!newContent.trim()) return;
    const newItem: DocItem = {
      id: Date.now(),
      content: newContent.trim(),
      updatedAt: getNow(),
    };
    setList((prev) => [newItem, ...prev]);
    setNewContent('');
  };

  return (
    <div className={styles['document-wrapper']}>
      {/* admin 顶部新增输入框 */}
      {isAdmin && (
        <div className={styles['add-bar']}>
          <TextArea
            className={styles['add-input']}
            placeholder="写点什么..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 6 }}
            bordered={false}
          />
          <Button className={styles['add-btn']} onClick={handleAdd}>
            发布
          </Button>
        </div>
      )}

      {/* 瀑布流 */}
      <div className={styles['masonry']}>
        {list.map((item) => (
          <div key={item.id} className={styles['masonry-item']}>
            {/* admin 操作按钮 */}
            {isAdmin && (
              <div className={styles['item-actions']}>
                <span onClick={() => handleDelete(item.id)}>
                  <DeleteOutlined /> 删除
                </span>
                <span onClick={() => handleEdit(item)}>
                  <EditOutlined /> 编辑
                </span>
              </div>
            )}

            {/* 内容区 */}
            {editingId === item.id ? (
              <div className={styles['edit-area']}>
                <TextArea
                  className={styles['edit-input']}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoSize={{ minRows: 3 }}
                  bordered={false}
                />
                <div className={styles['edit-btns']}>
                  <span onClick={handleCancelEdit}>取消</span>
                  <span onClick={() => handleSave(item.id)}>保存</span>
                </div>
              </div>
            ) : (
              <p className={styles['item-content']}>{item.content}</p>
            )}

            {/* 时间 */}
            <div className={styles['item-date']}>更新：{item.updatedAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentPage;
