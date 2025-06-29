import React, { useEffect, useState } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  List, 
  Badge, 
  Progress, 
  Empty,
  Modal,
  Form,
  Input,
  Checkbox,
  message
} from 'antd';
import { 
  PlusOutlined, 
  ClockCircleOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { fetchTasks, createTask, fetchCurrentTask } from '../store/slices/taskSlice';
import { fetchSteps, fetchTodoList } from '../store/slices/stepSlice';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [flowTypes, setFlowTypes] = useState<any[]>([]);
  const [form] = Form.useForm();

  const { currentTask, loading } = useSelector((state: RootState) => state.task);
  const { todoList, steps } = useSelector((state: RootState) => state.step);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchCurrentTask()); // 从API获取当前任务
    // 获取流程类型
    fetchFlowTypes();
  }, [dispatch]);

  useEffect(() => {
    if (currentTask) {
      dispatch(fetchSteps(currentTask.id));
      dispatch(fetchTodoList(currentTask.id));
    }
  }, [currentTask, dispatch]);

  // 获取流程类型列表
  const fetchFlowTypes = async () => {
    try {
      const response = await fetch('/api/tasks/flow-types');
      const data = await response.json();
      if (data.success) {
        setFlowTypes(data.data);
      }
    } catch (error) {
      console.error('获取流程类型失败:', error);
    }
  };

  const handleCreateTask = async (values: any) => {
    try {
      await dispatch(createTask(values)).unwrap();
      message.success('任务创建成功');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  const handleTodoClick = (todo: any) => {
    if (todo.stepId) {
      navigate(`/task/${todo.taskId}/step/${todo.stepId}`);
    }
  };



  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#fa8c16';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  return (
    <div>


      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 当前任务 */}
        <Col xs={24} lg={12}>
          <Card 
            title="当前任务" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
              >
                新建任务
              </Button>
            }
          >
            {currentTask ? (
              <div>
                <h3>{currentTask.name}</h3>
                <p style={{ color: '#666', marginBottom: 16 }}>
                  {currentTask.description}
                </p>
                {(() => {
                  // 计算实际进度
                  const completedSteps = steps.filter(s => s.status === 'completed').length;
                  const totalSteps = steps.length;
                  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                  
                  return (
                    <Progress 
                      percent={progress} 
                      status={progress === 100 ? 'success' : 'active'}
                      format={() => `${completedSteps}/${totalSteps} 完成`}
                    />
                  );
                })()}
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  创建时间: {new Date((currentTask as any).created_time || (currentTask as any).createdTime).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            ) : (
              <Empty 
                description="暂无进行中的任务"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* 待办事项 */}
        <Col xs={24} lg={12}>
          <Card title="当前可做事项" extra={<Badge count={todoList.length} />}>
            {todoList.length > 0 ? (
              <List
                dataSource={todoList}
                renderItem={(item: any) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleTodoClick(item)}
                    actions={[
                      <Button size="small" type="link">
                        {item.action === 'operate' ? '执行' : '确认'}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge 
                          color={getPriorityColor(item.priority)} 
                          text=""
                        />
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{item.title}</span>
                          {item.flowIcon && (
                            <span style={{ 
                              background: '#f0f0f0', 
                              padding: '2px 8px', 
                              borderRadius: 12, 
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {item.flowIcon} {item.flowLabel}
                            </span>
                          )}
                        </div>
                      }
                      description={
                        <div>
                          <div>{item.description}</div>
                          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            <ClockCircleOutlined /> 预计 {item.estimatedTime} 分钟
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="暂无待办事项"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 创建任务模态框 */}
      <Modal
        title="创建新任务"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="任务描述"
          >
            <Input.TextArea 
              rows={3}
              placeholder="请输入任务描述（可选）"
            />
          </Form.Item>

          <Form.Item
            name="flowTypes"
            label="流程类型"
            rules={[{ required: true, message: '请选择至少一个流程类型' }]}
            initialValue={['domestic_non_core']}
          >
            <Checkbox.Group 
              options={flowTypes.map(type => ({
                label: type.label,
                value: type.value
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard; 