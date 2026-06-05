import React, { useState, useEffect } from 'react';
import { history } from 'umi';
import { Breadcrumb, Form, Input, Select, Button, Upload, message } from 'antd';
import {
  InboxOutlined,
  HomeOutlined,
  FileZipOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { createImportTask } from '@/services/importTask';
import { getArtistList } from '@/services/artist';
import styles from './Add.less';

const { Dragger } = Upload;
const { Option } = Select;

const AddImportTaskPage: React.FC = () => {
  const [form] = Form.useForm();
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 上传状态
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    getArtistList()
      .then((res: any) => {
        setArtists(
          Array.isArray(res)
            ? res.map((a: any) => ({
                name: a.name,
                artistId: a.artistId || a.id,
              }))
            : [],
        );
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setUploaded(false);
      setUploadedFile(null);
      form.setFieldsValue({ datasetName: '' });
    }
  };

  const handleFile = (file: File) => {
    setUploaded(true);
    setUploadedFile(file);
    // 自动回填文件名称（去掉扩展名）
    const fileName = file.name.replace(/\.zip$/i, '');
    form.setFieldsValue({ datasetName: fileName });
    return false; // 阻止自动上传
  };

  const handleRemoveZip = () => {
    setFileList([]);
    setUploaded(false);
    setUploadedFile(null);
    form.setFieldsValue({ datasetName: '' });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!uploadedFile) {
        message.error('请先上传压缩包');
        return;
      }

      setSubmitLoading(true);
      const artist = artists.find((a) => a.artistId === values.artistId);

      await createImportTask({
        name: values.datasetName,
        artistId: values.artistId,
        artistName: artist?.name || '',
        file: uploadedFile,
      });

      message.success('数据集上传成功，后台正在处理');
      history.push('/admin/import/tasks');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '提交失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className={styles['import-add-page']}>
      {/* 面包屑 */}
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/import/tasks')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              导入列表
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>新增数据集</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* 表单容器 */}
      <div className={styles['form-panel']}>
        <div className={styles['form-wrap']}>
          <Form form={form} layout="vertical" className={styles['add-form']}>
            {/* 1. 上传压缩包 */}
            <Form.Item
              label="上传压缩包"
              required
              className={styles['upload-item']}
            >
              {uploaded && uploadedFile ? (
                <div className={styles['zip-preview']}>
                  <FileZipOutlined className={styles['zip-icon']} />
                  <div className={styles['zip-info']}>
                    <span className={styles['zip-name']}>
                      {uploadedFile.name}
                    </span>
                    <span className={styles['zip-size']}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <CloseOutlined
                    className={styles['zip-remove']}
                    onClick={handleRemoveZip}
                  />
                </div>
              ) : (
                <Dragger
                  accept=".zip"
                  fileList={fileList}
                  beforeUpload={handleFile}
                  onChange={handleFileChange}
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    点击或拖拽压缩包到此区域上传
                  </p>
                  <p className={styles['upload-hint']}>
                    支持 ZIP 格式，2G 以内
                  </p>
                </Dragger>
              )}
            </Form.Item>

            {/* 2. 数据集名称 */}
            <Form.Item
              name="datasetName"
              label="数据集名称"
              rules={[{ required: true, message: '请输入数据集名称' }]}
            >
              <Input
                placeholder="上传压缩包后自动获取，可手动修改"
                maxLength={100}
              />
            </Form.Item>

            {/* 3. 艺人 */}
            <Form.Item
              name="artistId"
              label="艺人"
              rules={[{ required: true, message: '请选择艺人' }]}
            >
              <Select
                placeholder="请选择艺人"
                loading={loading}
                showSearch
                optionFilterProp="children"
              >
                {artists.map((a) => (
                  <Option key={a.artistId} value={a.artistId}>
                    {a.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitLoading}
                className={styles['submit-btn']}
                block
              >
                提交上传
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddImportTaskPage;
