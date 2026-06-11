import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CloseOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getPhotoTypes,
  createPhotoType,
  updatePhotoType,
  deletePhotoType,
  updateTypeSortOrder,
  getPhotoLocations,
  createPhotoLocation,
  updatePhotoLocation,
  deletePhotoLocation,
  updateLocationSortOrder,
  getPhotoPlatforms,
  createPhotoPlatform,
  updatePhotoPlatform,
  deletePhotoPlatform,
  updatePlatformSortOrder,
  getPhotoCardTypes,
  createPhotoCardType,
  updatePhotoCardType,
  deletePhotoCardType,
  updateCardTypeSortOrder,
} from '@/services/photoTag';

import styles from './index.less';

interface TagItem {
  id: number;
  name: string;
  uuid?: string;
}

interface Props {}

// 可拖拽卡片组件
const SortableCard: React.FC<{
  item: TagItem;
  onEdit: (item: TagItem) => void;
  onDelete: (id: number) => void;
}> = ({ item, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.itemCard}>
      <div className={styles.itemActions}>
        <span {...attributes} {...listeners} className={styles.dragHandle}>
          <HolderOutlined />
        </span>
        <EditOutlined
          className={styles.editIcon}
          onClick={() => onEdit(item)}
        />
        <CloseOutlined
          className={styles.deleteIcon}
          onClick={() => onDelete(item.id)}
        />
      </div>
      <div className={styles.itemContent}>
        <span className={styles.itemName}>{item.name}</span>
        {/* {item.uuid && <span className={styles.itemUuid}>{item.uuid}</span>} */}
      </div>
    </div>
  );
};

const PhotoTagPage: React.FC<Props> = () => {
  // 照片类型状态
  const [photoTypes, setPhotoTypes] = useState<TagItem[]>([]);

  // 发布平台状态
  const [platforms, setPlatforms] = useState<TagItem[]>([]);

  // 拍摄地点状态
  const [locations, setLocations] = useState<TagItem[]>([]);

  // 小卡类型状态
  const [cardTypes, setCardTypes] = useState<TagItem[]>([]);

  // 弹窗状态
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [typeEditItem, setTypeEditItem] = useState<TagItem | null>(null);
  const [platformModalVisible, setPlatformModalVisible] = useState(false);
  const [platformEditItem, setPlatformEditItem] = useState<TagItem | null>(
    null,
  );
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationEditItem, setLocationEditItem] = useState<TagItem | null>(
    null,
  );
  const [cardTypeModalVisible, setCardTypeModalVisible] = useState(false);
  const [cardTypeEditItem, setCardTypeEditItem] = useState<TagItem | null>(
    null,
  );

  // 表单实例
  const [typeForm] = Form.useForm();
  const [platformForm] = Form.useForm();
  const [locationForm] = Form.useForm();
  const [cardTypeForm] = Form.useForm();

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    loadPhotoTypes();
    loadPlatforms();
    loadLocations();
    loadCardTypes();
  }, []);

  // 加载照片类型列表
  const loadPhotoTypes = async () => {
    try {
      const data = await getPhotoTypes();
      setPhotoTypes(data || []);
    } catch {
      // 错误由拦截器统一处理
    }
  };

  // 加载发布平台列表
  const loadPlatforms = async () => {
    try {
      const data = await getPhotoPlatforms();
      setPlatforms(data || []);
    } catch {
      // 错误由拦截器统一处理
    }
  };

  // 加载小卡类型列表
  const loadCardTypes = async () => {
    try {
      const data = await getPhotoCardTypes();
      setCardTypes(data || []);
    } catch {
      // 错误由拦截器统一处理
    }
  };

  // 加载拍摄地点列表
  const loadLocations = async () => {
    try {
      const data = await getPhotoLocations();
      setLocations(data || []);
    } catch {
      // 错误由拦截器统一处理
    }
  };

  // 打开照片类型新增/编辑弹窗
  const openTypeModal = (item?: TagItem) => {
    if (item) {
      setTypeEditItem(item);
      typeForm.setFieldsValue({ name: item.name });
    } else {
      setTypeEditItem(null);
      typeForm.resetFields();
    }
    setTypeModalVisible(true);
  };

  // 打开发布平台新增/编辑弹窗
  const openPlatformModal = (item?: TagItem) => {
    if (item) {
      setPlatformEditItem(item);
      platformForm.setFieldsValue({ name: item.name, uuid: item.uuid });
    } else {
      setPlatformEditItem(null);
      platformForm.resetFields();
    }
    setPlatformModalVisible(true);
  };

  // 打开小卡类型新增/编辑弹窗
  const openCardTypeModal = (item?: TagItem) => {
    if (item) {
      setCardTypeEditItem(item);
      cardTypeForm.setFieldsValue({ name: item.name });
    } else {
      setCardTypeEditItem(null);
      cardTypeForm.resetFields();
    }
    setCardTypeModalVisible(true);
  };

  // 打开拍摄地点新增/编辑弹窗
  const openLocationModal = (item?: TagItem) => {
    if (item) {
      setLocationEditItem(item);
      locationForm.setFieldsValue({ name: item.name });
    } else {
      setLocationEditItem(null);
      locationForm.resetFields();
    }
    setLocationModalVisible(true);
  };

  // 提交照片类型表单
  const submitTypeForm = async () => {
    try {
      const values = await typeForm.validateFields();
      if (typeEditItem) {
        await updatePhotoType(typeEditItem.id, values.name);
        message.success('修改成功');
      } else {
        await createPhotoType(values.name);
        message.success('添加成功');
      }
      setTypeModalVisible(false);
      loadPhotoTypes();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 提交发布平台表单
  const submitPlatformForm = async () => {
    try {
      const values = await platformForm.validateFields();
      if (platformEditItem) {
        await updatePhotoPlatform(
          platformEditItem.id,
          values.name,
          values.uuid,
        );
        message.success('修改成功');
      } else {
        await createPhotoPlatform(values.name, values.uuid);
        message.success('添加成功');
      }
      setPlatformModalVisible(false);
      loadPlatforms();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 提交小卡类型表单
  const submitCardTypeForm = async () => {
    try {
      const values = await cardTypeForm.validateFields();
      if (cardTypeEditItem) {
        await updatePhotoCardType(cardTypeEditItem.id, values.name);
        message.success('修改成功');
      } else {
        await createPhotoCardType(values.name);
        message.success('添加成功');
      }
      setCardTypeModalVisible(false);
      loadCardTypes();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 提交拍摄地点表单
  const submitLocationForm = async () => {
    try {
      const values = await locationForm.validateFields();
      if (locationEditItem) {
        await updatePhotoLocation(locationEditItem.id, values.name);
        message.success('修改成功');
      } else {
        await createPhotoLocation(values.name);
        message.success('添加成功');
      }
      setLocationModalVisible(false);
      loadLocations();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 删除照片类型
  const deleteType = (id: number) => {
    Modal.confirm({
      title: '提示',
      content: '确定要删除该类型吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePhotoType(id);
          message.success('删除成功');
          loadPhotoTypes();
        } catch {
          // 错误由拦截器统一处理
        }
      },
    });
  };

  // 删除发布平台
  const deletePlatform = (id: number) => {
    Modal.confirm({
      title: '提示',
      content: '确定要删除该发布平台吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePhotoPlatform(id);
          message.success('删除成功');
          loadPlatforms();
        } catch {
          // 错误由拦截器统一处理
        }
      },
    });
  };

  // 删除小卡类型
  const deleteCardType = (id: number) => {
    Modal.confirm({
      title: '提示',
      content: '确定要删除该小卡类型吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePhotoCardType(id);
          message.success('删除成功');
          loadCardTypes();
        } catch {
          // 错误由拦截器统一处理
        }
      },
    });
  };

  // 删除拍摄地点
  const deleteLocation = (id: number) => {
    Modal.confirm({
      title: '提示',
      content: '确定要删除该地点吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePhotoLocation(id);
          message.success('删除成功');
          loadLocations();
        } catch {
          // 错误由拦截器统一处理
        }
      },
    });
  };

  // ─── 拖拽排序处理 ───

  const handleTypeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photoTypes.findIndex((t) => t.id === active.id);
    const newIndex = photoTypes.findIndex((t) => t.id === over.id);
    const newItems = arrayMove(photoTypes, oldIndex, newIndex).map(
      (item, index) => ({ ...item, sortOrder: index + 1 }),
    );
    setPhotoTypes(newItems);

    try {
      await updateTypeSortOrder(
        newItems.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
    } catch {
      loadPhotoTypes();
    }
  };

  const handlePlatformDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = platforms.findIndex((p) => p.id === active.id);
    const newIndex = platforms.findIndex((p) => p.id === over.id);
    const newItems = arrayMove(platforms, oldIndex, newIndex).map(
      (item, index) => ({ ...item, sortOrder: index + 1 }),
    );
    setPlatforms(newItems);

    try {
      await updatePlatformSortOrder(
        newItems.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
    } catch {
      loadPlatforms();
    }
  };

  const handleLocationDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = locations.findIndex((l) => l.id === active.id);
    const newIndex = locations.findIndex((l) => l.id === over.id);
    const newItems = arrayMove(locations, oldIndex, newIndex).map(
      (item, index) => ({ ...item, sortOrder: index + 1 }),
    );
    setLocations(newItems);

    try {
      await updateLocationSortOrder(
        newItems.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
    } catch {
      loadLocations();
    }
  };

  const handleCardTypeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cardTypes.findIndex((c) => c.id === active.id);
    const newIndex = cardTypes.findIndex((c) => c.id === over.id);
    const newItems = arrayMove(cardTypes, oldIndex, newIndex).map(
      (item, index) => ({ ...item, sortOrder: index + 1 }),
    );
    setCardTypes(newItems);

    try {
      await updateCardTypeSortOrder(
        newItems.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      );
    } catch {
      loadCardTypes();
    }
  };

  return (
    <div className={styles['pohoto-tag-page']}>
      {/* 照片类型区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          拍摄类型
        </h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTypeDragEnd}
        >
          <div className={styles.cardList}>
            <div className={styles.addCard} onClick={() => openTypeModal()}>
              <PlusOutlined className={styles.addIcon} />
              <span>新建类型</span>
            </div>
            <SortableContext
              items={photoTypes.map((i) => i.id)}
              strategy={horizontalListSortingStrategy}
            >
              {photoTypes.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  onEdit={openTypeModal}
                  onDelete={deleteType}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* 发布平台区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          发布平台
        </h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handlePlatformDragEnd}
        >
          <div className={styles.cardList}>
            <div className={styles.addCard} onClick={() => openPlatformModal()}>
              <PlusOutlined className={styles.addIcon} />
              <span>新建发布平台</span>
            </div>
            <SortableContext
              items={platforms.map((i) => i.id)}
              strategy={horizontalListSortingStrategy}
            >
              {platforms.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  onEdit={openPlatformModal}
                  onDelete={deletePlatform}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* 拍摄地点区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          拍摄地点
        </h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLocationDragEnd}
        >
          <div className={styles.cardList}>
            <div className={styles.addCard} onClick={() => openLocationModal()}>
              <PlusOutlined className={styles.addIcon} />
              <span>新建拍摄地点</span>
            </div>
            <SortableContext
              items={locations.map((i) => i.id)}
              strategy={horizontalListSortingStrategy}
            >
              {locations.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  onEdit={openLocationModal}
                  onDelete={deleteLocation}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* 小卡类型区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          小卡类型
        </h2>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCardTypeDragEnd}
        >
          <div className={styles.cardList}>
            <div className={styles.addCard} onClick={() => openCardTypeModal()}>
              <PlusOutlined className={styles.addIcon} />
              <span>新建小卡类型</span>
            </div>
            <SortableContext
              items={cardTypes.map((i) => i.id)}
              strategy={horizontalListSortingStrategy}
            >
              {cardTypes.map((item) => (
                <SortableCard
                  key={item.id}
                  item={item}
                  onEdit={openCardTypeModal}
                  onDelete={deleteCardType}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* 照片类型新增/编辑弹窗 */}
      <Modal
        title={typeEditItem ? '编辑类型' : '新建类型'}
        open={typeModalVisible}
        onOk={submitTypeForm}
        onCancel={() => setTypeModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={typeForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          <Form.Item
            label="类型名称"
            name="name"
            rules={[
              { required: true, message: '请输入类型名称' },
              { min: 1, max: 10, message: '长度在1-10个字符' },
            ]}
          >
            <Input placeholder="请输入类型名称" maxLength={10} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发布平台新增/编辑弹窗 */}
      <Modal
        title={platformEditItem ? '编辑发布平台' : '新建发布平台'}
        open={platformModalVisible}
        onOk={submitPlatformForm}
        onCancel={() => setPlatformModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={platformForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          <Form.Item
            label="平台名称"
            name="name"
            rules={[
              { required: true, message: '请输入平台名称' },
              { min: 1, max: 10, message: '长度在1-10个字符' },
            ]}
          >
            <Input placeholder="请输入平台名称" maxLength={10} showCount />
          </Form.Item>
          <Form.Item
            label="平台ID"
            name="uuid"
            rules={[
              { required: true, message: '请输入平台ID' },
              {
                pattern: /^[a-zA-Z0-9]+$/,
                message: '只能输入数字和英文字母',
              },
            ]}
          >
            <Input placeholder="请输入平台ID（数字和字母）" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 拍摄地点新增/编辑弹窗 */}
      <Modal
        title={locationEditItem ? '编辑地点' : '新建地点'}
        open={locationModalVisible}
        onOk={submitLocationForm}
        onCancel={() => setLocationModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={locationForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          <Form.Item
            label="地点名称"
            name="name"
            rules={[
              { required: true, message: '请输入地点名称' },
              { min: 1, max: 10, message: '长度在1-10个字符' },
            ]}
          >
            <Input placeholder="请输入地点名称" maxLength={10} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 小卡类型新增/编辑弹窗 */}
      <Modal
        title={cardTypeEditItem ? '编辑小卡类型' : '新建小卡类型'}
        open={cardTypeModalVisible}
        onOk={submitCardTypeForm}
        onCancel={() => setCardTypeModalVisible(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={cardTypeForm}
          layout="vertical"
          className={styles['tag-form']}
          preserve={false}
          autoComplete="off"
        >
          <Form.Item
            label="小卡类型名称"
            name="name"
            rules={[
              { required: true, message: '请输入小卡类型名称' },
              { min: 1, max: 10, message: '长度在1-10个字符' },
            ]}
          >
            <Input placeholder="请输入小卡类型名称" maxLength={10} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhotoTagPage;
