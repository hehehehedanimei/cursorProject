import React, { useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  List, 
  Badge, 
  Progress, 
  Statistic, 
  Empty,
  Modal,
  Form,
  Input,
  message
} from 'antd';
import { 
  PlayCircleOutlined, 
  PlusOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { fetchTasks, createTask, setCurrentTask } from '../store/slices/taskSlice';
import { fetchSteps } from '../store/slices/stepSlice';
import { generateTodoList } from '../store/slices/stepSlice';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  const { tasks, currentTask, loading } = useSelector((state: RootState) => state.task);
  const { todoList } = useSelector((state: RootState) => state.step);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  useEffect(() => {
    if (currentTask) {
      dispatch(fetchSteps(currentTask.id)).then(() => {
        dispatch(generateTodoList(currentTask.id));
      });
    } else if (tasks.length > 0) {
      // 如果没有当前任务，自动选择第一个draft状态的任务
      const activeTask = tasks.find(task => 
        task.status === 'draft' || task.status === 'in_progress'
      );
      if (activeTask) {
        dispatch(setCurrentTask(activeTask));
      }
    }
  }, [currentTask, tasks, dispatch]);

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

  // 统计数据
  const statistics = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
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
      <Row gutter={[16, 16]}>
        {/* 统计卡片 */}
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={statistics.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="进行中"
              value={statistics.inProgress}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成"
              value={statistics.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失败"
              value={statistics.failed}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

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
                <Progress 
                  percent={50} 
                  status="active"
                  format={() => '进行中'}
                />
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  创建时间: {new Date((currentTask as any).created_time || (currentTask as any).createdTime).toLocaleString()}
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
                      title={item.title}
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
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard; 