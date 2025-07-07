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
  Popconfirm,
  InputNumber,
  Tag,

  Row,
  Col
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
  const [isFlowModalVisible, setIsFlowModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [flowTemplates, setFlowTemplates] = useState<any>({});
  const [editingFlowType, setEditingFlowType] = useState<string>('');
  const [editingFlowSteps, setEditingFlowSteps] = useState<any[]>([]);

  const { services, loading } = useSelector((state: RootState) => state.service);
  const { configs, templates } = useSelector((state: RootState) => state.config);

  useEffect(() => {
    dispatch(fetchServices());
    dispatch(fetchConfigs());
    dispatch(fetchTemplates());
    fetchFlowTemplates();
  }, [dispatch]);

  // 获取流程模板配置
  const fetchFlowTemplates = async () => {
    try {
      const response = await fetch('/api/configs/flow-templates');
      const data = await response.json();
      if (data.success) {
        // 按流程类型分组
        const grouped = data.data.reduce((acc: any, template: any) => {
          if (!acc[template.flow_type]) {
            acc[template.flow_type] = [];
          }
          acc[template.flow_type].push(template);
          return acc;
        }, {});
        setFlowTemplates(grouped);
      }
    } catch (error) {
      console.error('获取流程模板失败:', error);
    }
  };

  // 编辑流程模板
  const handleEditFlowTemplate = (flowType: string) => {
    const templates = flowTemplates[flowType] || [];
    setEditingFlowType(flowType);
    setEditingFlowSteps(templates.map((t: any) => ({
      stepName: t.step_name,
      stepType: t.step_type,
      estimatedDuration: t.estimated_duration,
      dependencies: JSON.parse(t.dependencies || '[]'),
      links: linksToText(JSON.parse(t.links || '[]'))
    })));
    setIsFlowModalVisible(true);
  };

  // 保存流程模板
  const handleSaveFlowTemplate = async () => {
    try {
      // 转换步骤数据，将链接文本转换为JSON格式
      const templatesWithLinks = editingFlowSteps.map(step => ({
        ...step,
        links: JSON.stringify(parseLinks(step.links || ''))
      }));
      
      const response = await fetch(`/api/configs/flow-templates/${editingFlowType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templates: templatesWithLinks
        })
      });
      
      const data = await response.json();
      if (data.success) {
        message.success('流程模板保存成功');
        setIsFlowModalVisible(false);
        fetchFlowTemplates();
      } else {
        message.error(data.message || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 重置流程模板
  const handleResetFlowTemplate = async (flowType: string) => {
    try {
      const response = await fetch(`/api/configs/flow-templates/${flowType}/reset`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        message.success('流程模板已重置为默认配置');
        fetchFlowTemplates();
      } else {
        message.error(data.message || '重置失败');
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 添加流程步骤
  const handleAddFlowStep = () => {
    setEditingFlowSteps([...editingFlowSteps, {
      stepName: '',
      stepType: 'config',
      estimatedDuration: 5,
      dependencies: [],
      links: ''
    }]);
  };

  // 删除流程步骤
  const handleRemoveFlowStep = (index: number) => {
    const newSteps = editingFlowSteps.filter((_, i) => i !== index);
    setEditingFlowSteps(newSteps);
  };

  // 更新流程步骤
  const handleUpdateFlowStep = (index: number, field: string, value: any) => {
    const newSteps = [...editingFlowSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditingFlowSteps(newSteps);
  };

  // 解析链接文本为数组
  const parseLinks = (linksText: string) => {
    if (!linksText || !linksText.trim()) return [];
    try {
      return linksText.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split('|');
          if (parts.length >= 2) {
            return {
              name: parts[0].trim(),
              url: parts[1].trim()
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  // 链接数组转文本
  const linksToText = (links: any[]) => {
    if (!links || links.length === 0) return '';
    return links.map(link => `${link.name}|${link.url}`).join('\n');
  };

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

        <TabPane tab="流程配置" key="flows">
          <Card title="流程模板配置">
            <Row gutter={[16, 16]}>
              {Object.entries({
                'domestic_non_core': { label: '国内非核心', color: '#1890ff', icon: '🏠' },
                'international_non_core': { label: '国际非核心', color: '#52c41a', icon: '🌍' },
                'international_crawler': { label: '国际爬虫', color: '#fa8c16', icon: '🕷️' }
              }).map(([flowType, info]) => {
                const templates = flowTemplates[flowType] || [];
                return (
                  <Col xs={24} md={8} key={flowType}>
                    <Card
                      size="small"
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{info.icon}</span>
                          <span style={{ color: info.color }}>{info.label}</span>
                          <Tag color={info.color}>{templates.length} 步骤</Tag>
                        </div>
                      }
                      extra={
                        <Space>
                          <Button 
                            size="small" 
                            type="primary"
                            onClick={() => handleEditFlowTemplate(flowType)}
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="确定重置为默认配置吗？"
                            onConfirm={() => handleResetFlowTemplate(flowType)}
                          >
                            <Button size="small">重置</Button>
                          </Popconfirm>
                        </Space>
                      }
                    >
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {templates.map((template: any, index: number) => (
                          <div key={index} style={{ 
                            padding: '4px 0', 
                            borderBottom: index < templates.length - 1 ? '1px solid #f0f0f0' : 'none',
                            fontSize: 12 
                          }}>
                            <div style={{ fontWeight: 'bold' }}>
                              {index + 1}. {template.step_name}
                            </div>
                            <div style={{ color: '#666' }}>
                              <Tag color={
                                template.step_type === 'config' ? 'blue' :
                                template.step_type === 'deploy' ? 'green' :
                                template.step_type === 'verify' ? 'orange' :
                                template.step_type === 'switch' ? 'purple' : 'default'
                              }>
                                {template.step_type === 'config' ? '配置' :
                                 template.step_type === 'deploy' ? '部署' :
                                 template.step_type === 'verify' ? '验证' :
                                 template.step_type === 'switch' ? '切换' : template.step_type}
                              </Tag>
                              {template.estimated_duration}分钟
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {/* 流程配置编辑模态框 */}
      <Modal
        title={`编辑流程模板 - ${editingFlowType === 'domestic_non_core' ? '国内非核心' : 
                             editingFlowType === 'international_non_core' ? '国际非核心' : 
                             editingFlowType === 'international_crawler' ? '国际爬虫' : editingFlowType}`}
        open={isFlowModalVisible}
        onOk={handleSaveFlowTemplate}
        onCancel={() => {
          setIsFlowModalVisible(false);
          setEditingFlowType('');
          setEditingFlowSteps([]);
        }}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Button 
            type="dashed" 
            onClick={handleAddFlowStep}
            style={{ width: '100%' }}
          >
            + 添加步骤
          </Button>
        </div>
        
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {editingFlowSteps.map((step, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: 8 }}
              title={`步骤 ${index + 1}`}
              extra={
                <Button 
                  size="small" 
                  danger 
                  onClick={() => handleRemoveFlowStep(index)}
                >
                  删除
                </Button>
              }
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="步骤名称" style={{ marginBottom: 8 }}>
                    <Input
                      value={step.stepName}
                      placeholder="请输入步骤名称"
                      onChange={(e) => handleUpdateFlowStep(index, 'stepName', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="步骤类型" style={{ marginBottom: 8 }}>
                    <Select
                      value={step.stepType}
                      onChange={(value) => handleUpdateFlowStep(index, 'stepType', value)}
                    >
                      <Select.Option value="config">配置</Select.Option>
                      <Select.Option value="deploy">部署</Select.Option>
                      <Select.Option value="verify">验证</Select.Option>
                      <Select.Option value="switch">切换</Select.Option>
                      <Select.Option value="rollback">回滚</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="预计时长(分钟)" style={{ marginBottom: 8 }}>
                    <InputNumber
                      value={step.estimatedDuration}
                      min={1}
                      max={300}
                      onChange={(value) => handleUpdateFlowStep(index, 'estimatedDuration', value || 5)}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="依赖步骤" style={{ marginBottom: 8 }}>
                <Select
                  mode="multiple"
                  value={step.dependencies}
                  placeholder="选择依赖的步骤（按步骤顺序）"
                  onChange={(value) => handleUpdateFlowStep(index, 'dependencies', value)}
                >
                  {editingFlowSteps.map((_, depIndex) => {
                    if (depIndex >= index) return null; // 只能依赖前面的步骤
                    return (
                      <Select.Option key={depIndex + 1} value={depIndex + 1}>
                        步骤 {depIndex + 1}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
              <Form.Item label="相关链接" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  value={step.links}
                  rows={3}
                  placeholder="每行一个链接，格式：链接名称|链接地址&#10;例如：&#10;监控系统|https://monitor.example.com&#10;操作手册|https://docs.example.com"
                  onChange={(e) => handleUpdateFlowStep(index, 'links', e.target.value)}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  格式：链接名称|链接地址，每行一个
                </div>
              </Form.Item>
            </Card>
          ))}
        </div>
      </Modal>

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