import { useEffect, useState } from 'react';
import {
  Modal,
  Switch,
  Button,
  Spin,
  message,
  Space,
  Image,
  Empty,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import type { ArtistModuleConfig } from '@/services/artistModule';
import { getArtistModules, saveArtistModules } from '@/services/artistModule';
import { getImageUrl } from '@/utils/utils';
import styles from './ModuleSettingsModal.less';

interface Props {
  visible: boolean;
  artistId: number;
  artistName: string;
  onClose: () => void;
}

const ModuleSettingsModal = ({
  visible,
  artistId,
  artistName,
  onClose,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<ArtistModuleConfig[]>([]);
  // 原始快照，用于判断是否有变更
  const [originalIds, setOriginalIds] = useState<number[]>([]);

  // 加载艺人模块配置
  useEffect(() => {
    if (!visible || !artistId) return;

    setLoading(true);
    getArtistModules(artistId)
      .then((data) => {
        // 按 sortOrder 排序
        const sorted = (data || []).sort((a, b) => a.sortOrder - b.sortOrder);
        setModules(sorted);
        setOriginalIds(sorted.map((m) => m.id));
      })
      .catch(() => {
        message.error('获取模块配置失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visible, artistId]);

  // 切换启用/禁用
  const handleToggle = (id: number) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === 0 ? 1 : 0 } : m,
      ),
    );
  };

  // 上移
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setModules((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      // 更新 sortOrder
      return next.map((m, i) => ({ ...m, sortOrder: i }));
    });
  };

  // 下移
  const handleMoveDown = (index: number) => {
    setModules((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((m, i) => ({ ...m, sortOrder: i }));
    });
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveArtistModules(artistId, {
        modules: modules.map((m, index) => ({
          moduleId: m.id,
          sortOrder: index,
          status: m.status,
        })),
      });
      message.success('保存成功');
      onClose();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          APP 模块设置 —{' '}
          <span style={{ color: 'var(--color-primary, #ffffff)' }}>
            {artistName}
          </span>
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          保存设置
        </Button>,
      ]}
      className={styles['module-settings-modal']}
    >
      <Spin spinning={loading}>
        {!modules.length && !loading ? (
          <Empty description="暂无可用模块" />
        ) : (
          <div className={styles['module-grid']}>
            {modules.map((mod, index) => (
              <div
                key={mod.id}
                className={[
                  styles['module-card'],
                  !mod.status && styles['module-card-disabled'],
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* 模块封面 */}
                <div className={styles['module-cover']}>
                  {mod.image ? (
                    <Image
                      src={getImageUrl(mod.image)}
                      alt={mod.name}
                      preview={false}
                      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect fill='%23333' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='14'%3E📱%3C/text%3E%3C/svg%3E"
                    />
                  ) : (
                    <div className={styles['module-cover-placeholder']}>📱</div>
                  )}
                </div>

                {/* 信息区 */}
                <div className={styles['module-info']}>
                  <div className={styles['module-name']}>{mod.name}</div>
                  <div className={styles['module-key']}>{mod.key}</div>
                </div>

                {/* 操作区 */}
                <div className={styles['module-actions']}>
                  <Switch
                    size="small"
                    checked={!!mod.status}
                    onChange={() => handleToggle(mod.id)}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                  />

                  <Space size={2}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0 || modules.length <= 1}
                      onClick={() => handleMoveUp(index)}
                      className={styles['sort-btn']}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={
                        index === modules.length - 1 || modules.length <= 1
                      }
                      onClick={() => handleMoveDown(index)}
                      className={styles['sort-btn']}
                    />
                  </Space>

                  <span className={styles['sort-index']}>#{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default ModuleSettingsModal;
