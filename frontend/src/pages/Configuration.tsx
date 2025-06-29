import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Tabs, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select,
  message,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchServices, createService, updateService, deleteService } from '../store/slices/serviceSlice';
import { fetchConfigs, fetchTemplates } from '../store/slices/configSlice';
import { ServiceType, Region, CoreLevel, IDC, GroupName } from '../types';

const { TabPane } = Tabs;

const Configuration: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const { services, loading } = useSelector((state: RootState) => state.service);
  const { configs, templates } = useSelector((state: RootState) => state.config);

  useEffect(() => {
    dispatch(fetchServices());
    dispatch(fetchConfigs());
    dispatch(fetchTemplates());
  }, [dispatch]);

  const handleCreateService = async (values: any) => {
    try {
      if (editingService) {
        await dispatch(updateService({ id: editingService.id, data: values })).unwrap();
        message.success('服务更新成功');
      } else {
        await dispatch(createService(values)).unwrap();
        message.success('服务创建成功');
      }
      setIsModalVisible(false);
      setEditingService(null);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    form.setFieldsValue(service);
    setIsModalVisible(true);
  };

  const handleDeleteService = async (id: number) => {
    try {
      await dispatch(deleteService(id)).unwrap();
      message.success('服务删除成功');
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const serviceColumns = [
    {
      title: '服务名称',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '地区',
      dataIndex: 'region',
      key: 'region',
    },
    {
      title: '核心程度',
      dataIndex: 'coreLevel',
      key: 'coreLevel',
    },
    {
      title: 'IDC',
      dataIndex: 'idc',
      key: 'idc',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditService(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个服务吗？"
            onConfirm={() => handleDeleteService(record.id)}
          >
            <Button 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const configColumns = [
    {
      title: '配置项',
      dataIndex: 'configKey',
      key: 'configKey',
    },
    {
      title: '配置值',
      dataIndex: 'configValue',
      key: 'configValue',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedTime',
      key: 'updatedTime',
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];

  const templateColumns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '模板内容',
      dataIndex: 'template',
      key: 'template',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => active ? '启用' : '禁用',
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="services">
        <TabPane tab="服务配置" key="services">
          <Card
            title="服务配置"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingService(null);
                  form.resetFields();
                  setIsModalVisible(true);
                }}
              >
                添加服务
              </Button>
            }
          >
            <Table
              columns={serviceColumns}
              dataSource={services}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="系统配置" key="configs">
          <Card title="系统配置">
            <Table
              columns={configColumns}
              dataSource={configs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="消息模板" key="templates">
          <Card title="消息模板">
            <Table
              columns={templateColumns}
              dataSource={templates}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 服务配置模态框 */}
      <Modal
        title={editingService ? '编辑服务' : '添加服务'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingService(null);
          form.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateService}
        >
          <Form.Item
            name="name"
            label="服务名称"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="例如: goods-ds" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 商品数据服务" />
          </Form.Item>

          <Form.Item
            name="type"
            label="服务类型"
            rules={[{ required: true, message: '请选择服务类型' }]}
          >
            <Select>
              <Select.Option value={ServiceType.DS}>DS</Select.Option>
              <Select.Option value={ServiceType.SERVICE}>SERVICE</Select.Option>
              <Select.Option value={ServiceType.API}>API</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="region"
            label="地区"
            rules={[{ required: true, message: '请选择地区' }]}
          >
            <Select>
              <Select.Option value={Region.DOMESTIC}>国内</Select.Option>
              <Select.Option value={Region.INTERNATIONAL}>国际</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="coreLevel"
            label="核心程度"
            rules={[{ required: true, message: '请选择核心程度' }]}
          >
            <Select>
              <Select.Option value={CoreLevel.CORE}>核心</Select.Option>
              <Select.Option value={CoreLevel.NON_CORE}>非核心</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="idc"
            label="IDC"
            rules={[{ required: true, message: '请选择IDC' }]}
          >
            <Select>
              <Select.Option value={IDC.IDC1}>IDC1</Select.Option>
              <Select.Option value={IDC.IDC2}>IDC2</Select.Option>
              <Select.Option value={IDC.MIXED}>混合部署</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="groupName"
            label="分组"
          >
            <Select allowClear>
              <Select.Option value={GroupName.GROUP_A}>A组</Select.Option>
              <Select.Option value={GroupName.GROUP_B}>B组</Select.Option>
              <Select.Option value={GroupName.NOT_APPLICABLE}>不适用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="servicePath"
            label="服务路径"
          >
            <Input placeholder="服务路径（可选）" />
          </Form.Item>

          <Form.Item
            name="managementUrl"
            label="管理页面URL"
          >
            <Input placeholder="管理页面URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Configuration; 