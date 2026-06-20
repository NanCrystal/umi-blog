import React, { useEffect, useState } from 'react';
import { history, useLocation } from 'umi';
import {
  Breadcrumb,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Upload,
  message,
} from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { getArtistList } from '@/services/artist';
import {
  createAppModule,
  updateAppModule,
  getAppModuleDetail,
} from '@/services/appModule';
import { uploadImageFull } from '@/services/upload';
import { getImageUrl } from '@/utils/utils';
import styles from './Add.less';

const { TextArea } = Input;

interface ArtistItem {
  id: number;
  name: string;
  artistId: string;
}

const AddModulePage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showArtistSelect, setShowArtistSelect] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetchArtists();
    checkEditMode();
  }, []);

  const checkEditMode = async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      setEditId(Number(id));
      try {
        const data = await getAppModuleDetail(Number(id));
        form.setFieldsValue({
          name: data.name,
          key: data.key,
          description: data.description || '',
          status: data.status === 1,
          sortOrder: data.sortOrder ?? 0,
          artistIds: data.artistIds?.map((a: ArtistItem) => a.id) || [],
        });
        if (data.image) {
          setShowImageUpload(true);
          let imageList: string[] = [];
          try {
            const parsed =
              typeof data.image === 'string'
                ? JSON.parse(data.image)
                : data.image;
            imageList = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            imageList = [data.image];
          }
          form.setFieldValue(
            'image',
            imageList.map((url: string, index: number) => ({
              uid: `-${index}`,
              name: url.split('/').pop() || 'image',
              status: 'done',
              url,
              thumbUrl: getImageUrl(url),
            })),
          );
        }
        const hasArtists = data.artistIds && data.artistIds.length > 0;
        setShowArtistSelect(hasArtists);
      } catch {
        message.error('获取模块详情失败');
      }
    }
  };

  const fetchArtists = async () => {
    try {
      const data = await getArtistList();
      setArtists(data || []);
    } catch (error) {
      console.error('获取艺人列表失败', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      console.log('values', values);

      const getImageUrls = (val: any): string | undefined => {
        if (!val) return undefined;
        if (Array.isArray(val)) {
          const urls = val
            .map((item: any) => item?.response?.url || item?.url || item)
            .filter(Boolean);
          return urls.length > 0 ? JSON.stringify(urls) : undefined;
        }
        const url = val.response?.url || val.url || val;
        return url ? JSON.stringify([url]) : undefined;
      };
      console.log('values1', values);

      const payload: any = {
        name: values.name,
        key: values.key,
        description: values.description || undefined,
        sortOrder: values.sortOrder,
        status: values.status ? 1 : 0,
        image: getImageUrls(values.image),
        artistIds: showArtistSelect ? values.artistIds || [] : [],
      };

      if (editId) {
        await updateAppModule(editId, payload);
        message.success('更新成功');
      } else {
        await createAppModule(payload);
        message.success('新增成功');
      }
      history.push('/admin/app_settings');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(editId ? '更新失败' : '新增失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['add-module-page']}>
      <div className={styles['breadcrumb-wrap']}>
        <Breadcrumb className={styles['breadcrumb']}>
          <Breadcrumb.Item>
            <a onClick={() => history.push('/admin/app_settings')}>
              <HomeOutlined style={{ marginRight: 4 }} />
              APP管理
            </a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{editId ? '编辑模块' : '新增模块'}</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className={styles['tab-panel']}>
        <div className={styles['form-wrap']}>
          <Form
            form={form}
            layout="vertical"
            className={styles['add-form']}
            autoComplete="off"
            onFinish={handleSubmit}
            initialValues={{ status: true, sortOrder: 0 }}
          >
            <Form.Item
              label="是否开启模块 "
              name="status"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                defaultChecked
              />
            </Form.Item>

            <Form.Item
              label="模块名称"
              name="name"
              rules={[{ required: true, message: '请输入模块名称' }]}
            >
              <Input placeholder="请输入模块名称" maxLength={50} />
            </Form.Item>

            <Form.Item
              label="模块ID"
              name="key"
              rules={[
                { required: true, message: '请输入模块ID' },
                {
                  pattern: /^[a-zA-Z0-9]*$/,
                  message: '只能输入英文字母和数字',
                },
                { max: 20, message: '最多20个字符' },
              ]}
            >
              <Input
                placeholder="请输入模块ID（仅支持英文、数字）"
                maxLength={20}
                disabled={!!editId}
              />
            </Form.Item>

            <Form.Item label="是否配置图片" valuePropName="checked">
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
                checked={showImageUpload}
                onChange={(checked) => {
                  setShowImageUpload(checked);
                  if (!checked) form.setFieldValue('image', undefined);
                }}
              />
            </Form.Item>

            {showImageUpload && (
              <Form.Item
                label="上传图片"
                name="image"
                valuePropName="fileList"
                getValueFromEvent={(e: any) => {
                  if (Array.isArray(e)) return e;
                  return e?.fileList;
                }}
              >
                <Upload
                  listType="picture-card"
                  multiple
                  accept="image/*"
                  customRequest={async ({ file, onSuccess, onError }: any) => {
                    try {
                      const res = await uploadImageFull(file as File);
                      onSuccess(res);
                    } catch (err) {
                      onError(err);
                    }
                  }}
                >
                  + 上传
                </Upload>
              </Form.Item>
            )}

            <Form.Item
              label="排序"
              name="sortOrder"
              rules={[{ required: true, message: '请输入排序' }]}
            >
              <InputNumber
                min={0}
                placeholder="数字越小越靠前"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="是否配置艺人" valuePropName="checked">
              <Switch
                checkedChildren="是"
                unCheckedChildren="否"
                checked={showArtistSelect}
                onChange={(checked) => {
                  setShowArtistSelect(checked);
                  if (!checked) form.setFieldValue('artistIds', undefined);
                }}
              />
            </Form.Item>

            {showArtistSelect && (
              <Form.Item label="选择艺人" name="artistIds">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择艺人（可多选）"
                  optionFilterProp="label"
                  options={artists.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.artistId})`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item label="描述" name="description">
              <TextArea
                rows={4}
                placeholder="请输入描述信息（可选）"
                maxLength={200}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className={styles['submit-btn']}
              >
                提交
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddModulePage;
