import React, { useState, useEffect, useMemo } from 'react';
import { history, useLocation } from 'umi';
import {
  Breadcrumb,
  Tabs,
  Form,
  Input,
  Select,
  TreeSelect,
  DatePicker,
  Upload,
  Button,
  message,
  Radio,
  Modal,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  InboxOutlined,
  HomeOutlined,
  FileZipOutlined,
  CloseOutlined,
  LoadingOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import { getPhotoCardCategories } from '@/services/photoCard';
import { getArtistList } from '@/services/artist';
import {
  createPhotoCard,
  uploadCardImage,
  batchCreatePhotoCards,
} from '@/services/photoCard';
import { uploadZip } from '@/services/upload';
import type { PhotoCardCategory } from '@/services/photoCard';

/** 树形分类节点（后端直接返回嵌套结构） */
interface TreeCategory extends PhotoCardCategory {
  children?: TreeCategory[];
}
import styles from './index.less';
import { getImageUrl } from '@/utils/utils';

const { Dragger } = Upload;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

/* ============================================================
   新增小卡页面 - 支持 单个新增 / 批量新增
   ============================================================ */
const AddPhotoCardPage: React.FC = () => {
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // ─── 共用数据 ───
  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── 单个新增状态 ───
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [cardOrientation, setCardOrientation] = useState<
    'portrait' | 'landscape'
  >('portrait');

  // ─── 批量新增状态 ───
  const [batchFileList, setBatchFileList] = useState<UploadFile[]>([]);
  const [batchUploaded, setBatchUploaded] = useState(false);
  const [batchFileUrl, setBatchFileUrl] = useState('');
  const [batchFileName, setBatchFileName] = useState('');
  const [batchSubmitLoading, setBatchSubmitLoading] = useState(false);
  const [batchResultVisible, setBatchResultVisible] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  // ─── 加载下拉数据 ───
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, artistRes] = await Promise.all([
          getPhotoCardCategories(),
          getArtistList(),
        ]);
        setCategories(catRes || []);
        setArtists(artistRes || []);
      } catch {
        // 错误由拦截器统一处理
      }
    };
    loadData();
  }, []);

  // ─── 从 URL 读取预选分类 ID ───
  const location = useLocation();
  const defaultCategoryId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('categoryId');
    return id ? Number(id) : undefined;
  }, [location.search]);

  // 预填分类值
  useEffect(() => {
    if (defaultCategoryId) {
      form.setFieldsValue({ categoryId: defaultCategoryId });
      batchForm.setFieldsValue({ categoryId: defaultCategoryId });
    }
  }, [defaultCategoryId, form, batchForm]);

  // ─── 构建 TreeSelect 树形数据（后端已返回嵌套树，只需映射为 TreeSelect 格式） ───
  const categoryTreeData = useMemo(() => {
    const toTreeSelectNode = (nodes: TreeCategory[]): any[] => {
      return nodes.map((node) => ({
        title: node.name,
        value: node.id,
        key: node.id,
        children: node.children ? toTreeSelectNode(node.children) : undefined,
      }));
    };
    return toTreeSelectNode(categories);
  }, [categories]);

  // ─── 单个新增：上传正面图 ───
  const handleUploadFront = async (file: RcFile): Promise<false> => {
    setUploadingFront(true);
    try {
      const res = await uploadCardImage(file);
      setFrontUrl(res.url);
      form.setFieldsValue({ frontImage: res.url });
      message.success('正面图上传成功');
    } catch {
      message.error('正面图上传失败');
    } finally {
      setUploadingFront(false);
    }
    return false;
  };

  // ─── 单个新增：上传背面图 ───
  const handleUploadBack = async (file: RcFile): Promise<false> => {
    setUploadingBack(true);
    try {
      const res = await uploadCardImage(file);
      setBackUrl(res.url);
      form.setFieldsValue({ backImage: res.url });
      message.success('背面图上传成功');
    } catch {
      message.error('背面图上传失败');
    } finally {
      setUploadingBack(false);
    }
    return false;
  };

  // ─── 单个新增：提交 ───
  const handleSingleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const extractImageUrl = (imageData: any): string | undefined => {
        if (!imageData) return undefined;
        if (typeof imageData === 'string') return imageData;
        if (imageData.url) return imageData.url;
        if (imageData.fileList?.[0]) {
          const f = imageData.fileList[0];
          if (f.response?.url) return f.response.url;
          if (f.url) return f.url;
        }
        return undefined;
      };

      await createPhotoCard({
        name: values.name,
        frontImage: extractImageUrl(values.frontImage) || frontUrl,
        backImage: extractImageUrl(values.backImage) || backUrl || undefined,
        orientation: values.orientation || 'portrait',
        categoryId: values.categoryId || undefined,
        artistId: values.artistId || undefined,
        releaseDate: values.releaseDate
          ? values.releaseDate.format('YYYY-MM-DD')
          : undefined,
        remark: values.remark || undefined,
      });

      message.success('新增成功，即将返回列表页...');
      setTimeout(() => history.push('/admin/photocards'), 1000);
    } catch (error: any) {
      // 表单校验失败或接口错误
      message.error(error?.message || '新增失败');
    } finally {
      setLoading(false);
    }
  };

  // ─── 批量新增：上传 zip 到服务器 ───
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
      // 自动回填文件名称
      const fileName = (file as File).name.replace(/\.[^.]+$/, '');
      setBatchFileName(fileName);
      batchForm.setFieldsValue({ batchName: fileName });
      onSuccess({ url: res.url }, file);
    } catch (e: any) {
      const errMsg = e?.message || '上传失败';
      message.error(errMsg);
      onError(new Error(errMsg));
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
      batchForm.setFieldsValue({ batchName: '' });
    }
  };

  // ─── 批量新增：移除已上传的压缩包 ───
  const handleRemoveZip = () => {
    setBatchFileList([]);
    setBatchUploaded(false);
    setBatchFileUrl('');
    setBatchFileName('');
    batchForm.setFieldsValue({ batchName: '' });
  };

  // ─── 批量新增：提交 ───
  const handleBatchSubmit = async () => {
    if (!batchUploaded) {
      message.warning('请先上传 zip 压缩包');
      return;
    }

    try {
      setBatchSubmitLoading(true);
      const values = await batchForm.validateFields();

      const result = await batchCreatePhotoCards(
        {
          name: values.batchName || '',
          orientation: values.orientation || 'portrait',
          categoryId: values.categoryId || undefined,
          artistId: values.artistId || undefined,
          releaseDate: values.releaseDate
            ? values.releaseDate.format('YYYY-MM-DD')
            : undefined,
          remark: values.remark || undefined,
        },
        batchFileUrl,
      );

      setBatchResult(result);
      setBatchResultVisible(true);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || '批量新增失败');
    } finally {
      setBatchSubmitLoading(false);
    }
  };

  return (
    <div className={styles['add-photo-page']}>
      {/* 面包屑 */}
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/photocards')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              全部小卡
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>新增小卡</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* Tab 容器 */}
      <div className={styles['tab-panel']}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          className={styles['tabs']}
          centered
        >
          {/* ─── 单个新增 Tab ─── */}
          <TabPane tab="单个新增" key="single">
            <div className={styles['form-wrap']}>
              <Form
                form={form}
                layout="vertical"
                className={styles['add-form']}
                autoComplete="off"
                preserve={true}
                initialValues={{ orientation: 'portrait' }}
              >
                {/* 小卡方向 */}
                <Form.Item label="小卡方向" name="orientation">
                  <Radio.Group
                    value={cardOrientation}
                    onChange={(e) => setCardOrientation(e.target.value)}
                  >
                    <Radio value="portrait">竖屏 (55×85mm)</Radio>
                    <Radio value="landscape">横屏 (85×55mm)</Radio>
                  </Radio.Group>
                </Form.Item>

                {/* 正/背面上传 */}
                <div
                  className={`${styles['upload-row']} ${
                    styles[
                      cardOrientation === 'landscape'
                        ? 'upload-row-landscape'
                        : 'upload-row-portrait'
                    ]
                  }`}
                >
                  <Form.Item
                    label="小卡正面（必填）"
                    name="frontImage"
                    rules={[{ required: true, message: '请上传小卡正面图' }]}
                    className={styles['upload-item']}
                  >
                    <Upload
                      listType="picture-card"
                      showUploadList={false}
                      beforeUpload={
                        handleUploadFront as unknown as (
                          file: RcFile,
                          fileList: RcFile[],
                        ) => false
                      }
                      accept="image/*"
                      className={styles[`upload-${cardOrientation}`]}
                    >
                      {frontUrl ? (
                        <img
                          src={`/api${frontUrl}`}
                          alt="正面"
                          className={styles['upload-preview']}
                        />
                      ) : (
                        <div className={styles['upload-placeholder']}>
                          {uploadingFront ? (
                            <LoadingOutlined />
                          ) : (
                            <>
                              <UploadOutlined />
                              <span>上传正面</span>
                            </>
                          )}
                        </div>
                      )}
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    label="小卡背面（选填）"
                    name="backImage"
                    className={styles['upload-item']}
                  >
                    <Upload
                      listType="picture-card"
                      showUploadList={false}
                      beforeUpload={
                        handleUploadBack as unknown as (
                          file: RcFile,
                          fileList: RcFile[],
                        ) => false
                      }
                      accept="image/*"
                      className={styles[`upload-${cardOrientation}`]}
                    >
                      {backUrl ? (
                        <img
                          src={`/api${backUrl}`}
                          alt="背面"
                          className={styles['upload-preview']}
                        />
                      ) : (
                        <div className={styles['upload-placeholder']}>
                          {uploadingBack ? (
                            <LoadingOutlined />
                          ) : (
                            <>
                              <UploadOutlined />
                              <span>上传背面</span>
                            </>
                          )}
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </div>

                {/* 名称 */}
                <Form.Item
                  label="小卡名称"
                  name="name"
                  rules={[
                    { required: true, message: '请输入小卡名称' },
                    { min: 1, max: 50, message: '长度在1-50个字符' },
                  ]}
                >
                  <Input
                    placeholder="请输入小卡名称"
                    maxLength={50}
                    showCount
                  />
                </Form.Item>

                {/* 分类 - 树形选择 */}
                <Form.Item
                  label="所属分类"
                  name="categoryId"
                  rules={[{ required: true, message: '请选择所属分类' }]}
                >
                  <TreeSelect
                    treeData={categoryTreeData}
                    placeholder="请选择分类"
                    allowClear
                    treeDefaultExpandAll
                  />
                </Form.Item>

                {/* 艺人 */}
                <Form.Item
                  label="艺人"
                  name="artistId"
                  rules={[{ required: true, message: '请选择艺人' }]}
                >
                  <Select
                    placeholder="请选择艺人"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {artists.map((a) => (
                      <Option key={a.id} value={a.id}>
                        {a.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 发售时间 */}
                <Form.Item label="发售日期" name="releaseDate">
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder="选择发售日期（可选）"
                    format="YYYY-MM-DD"
                  />
                </Form.Item>

                {/* 备注 */}
                <Form.Item label="描述" name="remark">
                  <TextArea
                    placeholder="请输入描述信息"
                    maxLength={200}
                    showCount
                    rows={3}
                  />
                </Form.Item>

                {/* 提交按钮 */}
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleSingleSubmit}
                    loading={loading}
                    block
                    className={styles['submit-btn']}
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>

          {/* ─── 批量新增 Tab ─── */}
          <TabPane tab="批量新增" key="batch">
            <div className={styles['form-wrap']}>
              <Form
                form={batchForm}
                layout="vertical"
                className={styles['add-form']}
                autoComplete="off"
                preserve={true}
                initialValues={{ orientation: 'portrait' }}
              >
                {/* 上传压缩包 */}
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
                        style={{ opacity: 1 }}
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
                        温馨提示：请将小卡归类，压缩为 zip 文件上传，2G 以内
                      </p>
                    </Dragger>
                  )}
                </Form.Item>

                {/* 文件名称 */}
                <Form.Item
                  label="文件名称"
                  name="batchName"
                  rules={[{ required: true, message: '请输入文件名称' }]}
                >
                  <Input
                    placeholder="上传压缩包后自动获取，可手动修改"
                    maxLength={100}
                  />
                </Form.Item>

                {/* 艺人 */}
                <Form.Item
                  label="艺人"
                  name="artistId"
                  rules={[{ required: true, message: '请选择艺人' }]}
                >
                  <Select
                    placeholder="请选择艺人"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                  >
                    {artists.map((a) => (
                      <Option key={a.id} value={a.id}>
                        {a.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 小卡方向 */}
                <Form.Item label="小卡方向" name="orientation">
                  <Radio.Group defaultValue="portrait">
                    <Radio value="portrait">竖屏 (55×85mm)</Radio>
                    <Radio value="landscape">横屏 (85×55mm)</Radio>
                  </Radio.Group>
                </Form.Item>

                {/* 所属分类 */}
                <Form.Item
                  label="照片类型"
                  name="categoryId"
                  rules={[{ required: true, message: '请选择照片类型' }]}
                >
                  <TreeSelect
                    treeData={categoryTreeData}
                    placeholder="请选择照片类型"
                    allowClear
                    treeDefaultExpandAll
                  />
                </Form.Item>

                {/* 发售时间 */}
                <Form.Item label="拍摄日期" name="releaseDate">
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder="选择拍摄日期（可选）"
                    format="YYYY-MM-DD"
                  />
                </Form.Item>

                {/* 描述 */}
                <Form.Item label="描述" name="remark">
                  <TextArea
                    placeholder="所有小卡共用此备注"
                    maxLength={200}
                    showCount
                    rows={3}
                  />
                </Form.Item>

                {/* 提交按钮 */}
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleBatchSubmit}
                    loading={batchSubmitLoading}
                    disabled={!batchUploaded}
                    block
                    className={styles['submit-btn']}
                  >
                    提交
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* ─── 批量创建结果弹窗 ─── */}
      <Modal
        title="批量创建结果"
        open={batchResultVisible}
        onCancel={() => {
          setBatchResultVisible(false);
          if (batchResult?.failed === 0) {
            history.push('/admin/photocards');
          }
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setBatchResultVisible(false);
            }}
          >
            继续添加
          </Button>,
          ...(batchResult?.failed === 0
            ? [
                <Button
                  key="back"
                  type="primary"
                  onClick={() => {
                    setBatchResultVisible(false);
                    history.push('/admin/photocards');
                  }}
                >
                  返回列表
                </Button>,
              ]
            : []),
        ]}
        width={800}
      >
        {batchResult && (
          <div>
            {/* 统计信息 */}
            <div className={styles['batch-result-stats']}>
              <p>
                <strong>总计：</strong>
                {batchResult.total} 张
              </p>
              <p style={{ color: '#52c41a' }}>
                <strong>成功：</strong>
                {batchResult.created} 张
              </p>
              {batchResult.failed > 0 && (
                <p style={{ color: '#ff4d4f' }}>
                  <strong>失败：</strong>
                  {batchResult.failed} 张
                </p>
              )}
            </div>

            {/* 错误详情 */}
            {batchResult.errors && batchResult.errors.length > 0 && (
              <div style={{ marginTop: 16, maxHeight: 150, overflow: 'auto' }}>
                <strong>错误详情：</strong>
                <ul style={{ paddingLeft: 20 }}>
                  {batchResult.errors.map((err: string, idx: number) => (
                    <li key={idx} style={{ color: '#ff4d4f', fontSize: 12 }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 成功创建的卡片列表 */}
            {batchResult.cards && batchResult.cards.length > 0 && (
              <div className={styles['batch-result-cards']}>
                <strong>已创建的小卡列表：</strong>
                <div className={styles['batch-card-grid']}>
                  {batchResult.cards.map((card: any, idx: number) => (
                    <div
                      key={card.id || idx}
                      className={styles['batch-card-item']}
                    >
                      <img
                        src={getImageUrl(card.frontImage)}
                        alt={card.name}
                        className={styles['batch-card-img']}
                      />
                      <span
                        className={styles['batch-card-name']}
                        title={card.name}
                      >
                        {card.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AddPhotoCardPage;
