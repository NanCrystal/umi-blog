import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import {
  getPhotoTypes,
  createPhotoType,
  updatePhotoType,
  deletePhotoType,
  getPhotoLocations,
  createPhotoLocation,
  updatePhotoLocation,
  deletePhotoLocation,
} from '@/services/photoTag';

import styles from './index.less';

interface TagItem {
  id: number;
  name: string;
}

interface Props {}

const PhotoTagPage: React.FC<Props> = () => {
  // 照片类型状态
  const [photoTypes, setPhotoTypes] = useState<TagItem[]>([]);

  // 拍摄地点状态
  const [locations, setLocations] = useState<TagItem[]>([]);

  // 弹窗状态
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [typeEditItem, setTypeEditItem] = useState<TagItem | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationEditItem, setLocationEditItem] = useState<TagItem | null>(
    null,
  );

  // 表单实例
  const [typeForm] = Form.useForm();
  const [locationForm] = Form.useForm();

  useEffect(() => {
    loadPhotoTypes();
    loadLocations();
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

  return (
    <div className={styles['pohoto-tag-page']}>
      {/* 照片类型区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          照片类型
        </h2>
        <div className={styles.cardList}>
          <div className={styles.addCard} onClick={() => openTypeModal()}>
            <PlusOutlined className={styles.addIcon} />
            <span>新建类型</span>
          </div>
          {photoTypes.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              <div className={styles.itemActions}>
                <EditOutlined
                  className={styles.editIcon}
                  onClick={() => openTypeModal(item)}
                />
                <CloseOutlined
                  className={styles.deleteIcon}
                  onClick={() => deleteType(item.id)}
                />
              </div>
              <div className={styles.itemContent}>
                <span className={styles.itemName}>{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 拍摄地点区域 */}
      <div className={styles.section}>
        <h2 className={styles.title}>
          <span className={styles.dot}></span>
          拍摄地点
        </h2>
        <div className={styles.cardList}>
          <div className={styles.addCard} onClick={() => openLocationModal()}>
            <PlusOutlined className={styles.addIcon} />
            <span>新建拍摄地点</span>
          </div>
          {locations.map((item) => (
            <div key={item.id} className={styles.itemCard}>
              <div className={styles.itemActions}>
                <EditOutlined
                  className={styles.editIcon}
                  onClick={() => openLocationModal(item)}
                />
                <CloseOutlined
                  className={styles.deleteIcon}
                  onClick={() => deleteLocation(item.id)}
                />
              </div>
              <div className={styles.itemContent}>
                <span className={styles.itemName}>{item.name}</span>
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
};

export default PhotoTagPage;
