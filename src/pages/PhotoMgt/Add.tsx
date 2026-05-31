import React, { useState, useEffect } from 'react';
import { history } from 'umi';
import {
  Breadcrumb,
  Tabs,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Upload,
  message,
} from 'antd';
import {
  InboxOutlined,
  HomeOutlined,
  FileZipOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import moment from 'moment';
import { uploadImageFull, uploadZip } from '@/services/upload';
import { getArtistList } from '@/services/artist';
import { getPhotoTypes, getPhotoLocations } from '@/services/photoTag';
import { getItineraryList } from '@/services/itinerary';
import { createPhoto, batchCreatePhotos } from '@/services/photo';
import styles from './Add.less';
import ClosableImage from '@/component/ClosableImage';
import { getImageUrl } from '@/utils/utils';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// 从 JPEG 文件中读取 EXIF 拍摄日期
function readExifDate(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer);
        if (view.getUint16(0, false) !== 0xffd8) {
          resolve(null);
          return;
        }
        let offset = 2;
        while (offset < view.byteLength - 2) {
          if (view.getUint16(offset, false) === 0xffe1) {
            const exifStart = offset + 4;
            const str = new TextDecoder().decode(
              new DataView(view.buffer, view.byteOffset + exifStart),
            );
            const m = str.match(
              /(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
            );
            if (m) {
              resolve(`${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`);
              return;
            }
            resolve(null);
            return;
          }
          offset += 2 + view.getUint16(offset + 2, false);
        }
        resolve(null);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

const AddPhotoComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('single');
  const [singleForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 下拉数据
  const [artists, setArtists] = useState<any[]>([]);
  const [photoTypes, setPhotoTypes] = useState<any[]>([]);
  const [photoLocations, setPhotoLocations] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 单张上传
  const [singleFileList, setSingleFileList] = useState<UploadFile[]>([]);
  const [singleUploaded, setSingleUploaded] = useState(false);
  const [singleFileUrl, setSingleFileUrl] = useState('');
  const [singleSubmitLoading, setSingleSubmitLoading] = useState(false);

  // 批量上传
  const [batchFileList, setBatchFileList] = useState<UploadFile[]>([]);
  const [batchUploaded, setBatchUploaded] = useState(false);
  const [batchFileUrl, setBatchFileUrl] = useState('');
  const [batchFileName, setBatchFileName] = useState('');
  const [batchSubmitLoading, setBatchSubmitLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getArtistList().catch(() => []),
      getPhotoTypes().catch(() => []),
      getPhotoLocations().catch(() => []),
      getItineraryList({ pageSize: 999 }).catch(() => ({ list: [] })),
    ])
      .then(([artistsRes, typesRes, locsRes, itineraryRes]) => {
        setArtists(
          Array.isArray(artistsRes)
            ? artistsRes.map((a: any) => ({
                name: a.name,
                artistId: a.artistId || a.id,
              }))
            : [],
        );
        setPhotoTypes(Array.isArray(typesRes) ? typesRes : []);
        setPhotoLocations(Array.isArray(locsRes) ? locsRes : []);
        setItineraries(
          (itineraryRes as any)?.list ||
            (Array.isArray(itineraryRes) ? itineraryRes : []),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── 单张上传处理 ───
  const handleSingleCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadImageFull(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setSingleUploaded(true);
      setSingleFileUrl(res.url);

      // 自动回填文件名称（去掉扩展名）
      const fileName = (file as File).name.replace(/\.[^.]+$/, '');
      singleForm.setFieldsValue({ fileName });

      // 尝试读取 EXIF 拍摄日期
      const exifDate = await readExifDate(file as File);
      if (exifDate) {
        singleForm.setFieldsValue({ shootDate: moment(exifDate) });
      }

      onSuccess({ url: res.url }, file);
    } catch {
      message.error('图片上传失败');
      onError(new Error('上传失败'));
    }
  };

  const handleSingleFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setSingleFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setSingleUploaded(false);
      setSingleFileUrl('');
      singleForm.setFieldsValue({ fileName: '', shootDate: undefined });
    }
  };

  const handleSingleSubmit = async () => {
    try {
      const values = await singleForm.validateFields();
      if (!singleUploaded) {
        message.error('请先上传照片');
        return;
      }
      setSingleSubmitLoading(true);
      await createPhoto({
        fileName: values.fileName,
        url: singleFileUrl,
        artistId: values.artistId,
        shootDate: values.shootDate.format('YYYY-MM-DD HH:mm:ss'),
        photoTypeId: values.photoTypeId,
        photoLocationId: values.photoLocationId,
        itineraryId: values.itineraryId,
        description: values.description,
      });
      message.success('照片添加成功');
      history.push('/admin/photo');
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验失败
      message.error('添加失败');
    } finally {
      setSingleSubmitLoading(false);
    }
  };

  // ─── 批量上传处理 ───
  const handleBatchCustomRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const res = await uploadZip(file as File);
      if (!res?.url) {
        onError(new Error('上传失败'));
        return;
      }
      setBatchUploaded(true);
      setBatchFileUrl(res.url);
      // 自动回填文件名称（去掉扩展名）
      const fileName = (file as File).name.replace(/\.[^.]+$/, '');
      setBatchFileName(fileName);
      batchForm.setFieldsValue({ batchFileName: fileName });
      onSuccess({ url: res.url }, file);
    } catch {
      message.error('压缩包上传失败');
      onError(new Error('上传失败'));
    }
  };

  const handleBatchFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setBatchFileList([...info.fileList]);
    if (info.file.status === 'removed') {
      setBatchUploaded(false);
      setBatchFileUrl('');
      setBatchFileName('');
      batchForm.setFieldsValue({ batchFileName: '' });
    }
  };

  // 删除已上传的压缩包
  const handleRemoveZip = () => {
    setBatchFileList([]);
    setBatchUploaded(false);
    setBatchFileUrl('');
    setBatchFileName('');
    batchForm.setFieldsValue({ batchFileName: '' });
  };

  const handleBatchSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      if (!batchUploaded) {
        message.error('请先上传压缩包');
        return;
      }
      setBatchSubmitLoading(true);
      const res = await batchCreatePhotos(
        {
          artistId: values.artistId,
          shootDate: values.shootDate
            ? values.shootDate.format('YYYY-MM-DD HH:mm:ss')
            : undefined,
          photoTypeId: values.photoTypeId,
          photoLocationId: values.photoLocationId,
          description: values.description,
          fileUrl: batchFileUrl,
        },
        {
          timeout: 5 * 60 * 1000, // 批量处理 5 分钟超时
        },
      );
      message.success(res?.message || '照片批量添加成功');
      history.push('/admin/photo');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '添加失败');
    } finally {
      setBatchSubmitLoading(false);
    }
  };
  const handleRemoveImage = () => {
    setSingleFileList([]);
    setSingleUploaded(false);
    setSingleFileUrl('');
    singleForm.setFieldsValue({
      fileName: '',
      shootDate: undefined,
    });
  };
  return (
    <div className={styles['add-photo-page']}>
      {/* 面包屑 */}
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/photo')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              全部照片
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>添加照片</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* Tab 容器 */}
      <div className={styles['tab-panel']}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={styles['tabs']}
          centered
        >
          {/* ═══ 单张添加 ═══ */}
          <TabPane tab="单张添加" key="single">
            <div className={styles['form-wrap']}>
              <Form
                form={singleForm}
                layout="vertical"
                className={styles['add-form']}
              >
                {/* 1. 上传照片 */}
                <Form.Item
                  label="上传照片"
                  required
                  className={styles['upload-item']}
                >
                  {singleUploaded && singleFileUrl ? (
                    <ClosableImage
                      url={getImageUrl(singleFileUrl)}
                      onRemove={handleRemoveImage}
                    />
                  ) : (
                    <Dragger
                      accept=".jpg,.jpeg,.png"
                      fileList={singleFileList}
                      customRequest={handleSingleCustomRequest}
                      onChange={handleSingleFileChange}
                      maxCount={1}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽图片到此区域上传
                      </p>
                      <p className={styles['upload-hint']}>
                        温馨提示：支持 jpg、png 格式的图片，15M 以内
                      </p>
                    </Dragger>
                  )}
                </Form.Item>

                {/* 2. 文件名称 */}
                <Form.Item
                  name="fileName"
                  label="文件名称"
                  rules={[{ required: true, message: '请输入文件名称' }]}
                >
                  <Input
                    placeholder="上传图片后自动获取，可手动修改"
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

                {/* 4. 拍摄日期 */}
                <Form.Item
                  name="shootDate"
                  label="拍摄日期"
                  rules={[{ required: true, message: '请选择拍摄日期' }]}
                  extra="上传图片后默认自动获取拍摄时间，选择后将统一修改拍摄时间"
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%' }}
                    placeholder="选择拍摄日期"
                  />
                </Form.Item>

                {/* 5. 照片类型 */}
                <Form.Item name="photoTypeId" label="照片类型">
                  <Select
                    placeholder="请选择照片类型"
                    allowClear
                    loading={loading}
                  >
                    {photoTypes.map((t) => (
                      <Option key={t.id} value={t.id}>
                        {t.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 6. 拍摄地点 */}
                <Form.Item name="photoLocationId" label="拍摄地点">
                  <Select
                    placeholder="请选择拍摄地点"
                    allowClear
                    loading={loading}
                  >
                    {photoLocations.map((l) => (
                      <Option key={l.id} value={l.id}>
                        {l.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 7. 行程 */}
                <Form.Item name="itineraryId" label="行程">
                  <Select
                    placeholder="请选择行程"
                    allowClear
                    loading={loading}
                    showSearch
                    optionFilterProp="children"
                  >
                    {itineraries.map((i: any) => (
                      <Option key={i.id} value={i.id}>
                        {i.title} {i.location ? `· ${i.location}` : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 8. 描述 */}
                <Form.Item name="description" label="描述">
                  <TextArea
                    placeholder="请输入描述"
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleSingleSubmit}
                    loading={singleSubmitLoading}
                    className={styles['submit-btn']}
                    block
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>

          {/* ═══ 批量添加 ═══ */}
          <TabPane tab="批量添加" key="batch">
            <div className={styles['form-wrap']}>
              <Form
                form={batchForm}
                layout="vertical"
                className={styles['add-form']}
              >
                {/* 1. 上传压缩包 */}
                <Form.Item
                  label="上传压缩包"
                  required
                  className={styles['upload-item']}
                >
                  {batchUploaded && batchFileUrl ? (
                    <div className={styles['zip-preview']}>
                      <FileZipOutlined className={styles['zip-icon']} />
                      <div className={styles['zip-info']}>
                        <span className={styles['zip-name']}>
                          {batchFileName}.zip
                        </span>
                        <span className={styles['zip-size']}>已上传</span>
                      </div>
                      <CloseOutlined
                        className={styles['zip-remove']}
                        onClick={handleRemoveZip}
                      />
                    </div>
                  ) : (
                    <Dragger
                      accept=".zip"
                      fileList={batchFileList}
                      customRequest={handleBatchCustomRequest}
                      onChange={handleBatchFileChange}
                      maxCount={1}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖拽压缩包到此区域上传
                      </p>
                      <p className={styles['upload-hint']}>
                        温馨提示：请将图片归类，压缩为 zip 文件上传，2G 以内
                      </p>
                    </Dragger>
                  )}
                </Form.Item>

                {/* 2. 文件名称 */}
                <Form.Item
                  name="batchFileName"
                  label="文件名称"
                  rules={[{ required: true, message: '请输入文件名称' }]}
                >
                  <Input
                    placeholder="上传压缩包后自动获取，可手动修改"
                    maxLength={100}
                  />
                </Form.Item>

                {/* 2. 艺人 */}
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

                {/* 3. 拍摄日期（不必填） */}
                <Form.Item name="shootDate" label="拍摄日期">
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%' }}
                    placeholder="选择拍摄日期（可选）"
                  />
                </Form.Item>

                {/* 4. 照片类型（必填） */}
                <Form.Item
                  name="photoTypeId"
                  label="照片类型"
                  rules={[{ required: true, message: '请选择照片类型' }]}
                >
                  <Select placeholder="请选择照片类型" loading={loading}>
                    {photoTypes.map((t) => (
                      <Option key={t.id} value={t.id}>
                        {t.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 5. 拍摄地点（不必填） */}
                <Form.Item name="photoLocationId" label="拍摄地点">
                  <Select
                    placeholder="请选择拍摄地点"
                    allowClear
                    loading={loading}
                  >
                    {photoLocations.map((l) => (
                      <Option key={l.id} value={l.id}>
                        {l.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 6. 描述（不必填） */}
                <Form.Item name="description" label="描述">
                  <TextArea
                    placeholder="请输入描述"
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleBatchSubmit}
                    loading={batchSubmitLoading}
                    className={styles['submit-btn']}
                    block
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default AddPhotoComponent;
