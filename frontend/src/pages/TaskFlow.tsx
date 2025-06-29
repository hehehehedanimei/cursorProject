import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  Steps, 
  Button, 
  Progress, 
  Tag, 
  Timeline, 
  Row, 
  Col, 
  Space, 
  Descriptions,
  Alert,
  message,
  Modal,
  Input,
  Select,
  Form
} from 'antd';
import { 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSteps, updateStep } from '../store/slices/stepSlice';
import { fetchTasks, setCurrentTask } from '../store/slices/taskSlice';
import { TaskStep } from '../types';

const { Step } = Steps;
const { TextArea } = Input;

const TaskFlow: React.FC = () => {
  const dispatch = useAppDispatch();
  const { taskId, stepId } = useParams<{ taskId: string; stepId: string }>();
  const { steps, loading: stepsLoading } = useAppSelector(state => state.step);
  const { tasks, currentTask, loading: tasksLoading } = useAppSelector(state => state.task);
  
  const [currentStep, setCurrentStep] = useState<TaskStep | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载数据
  useEffect(() => {
    console.log('TaskFlow - 路由参数:', { taskId, stepId });
    
    // 如果有taskId参数，加载对应任务
    if (taskId) {
      const taskIdNum = parseInt(taskId);
      dispatch(fetchSteps(taskIdNum));
      
      // 如果任务列表为空，先加载任务列表
      if (tasks.length === 0) {
        dispatch(fetchTasks()).then(() => {
          const task = tasks.find(t => t.id === taskIdNum);
          if (task) {
            dispatch(setCurrentTask(task));
          }
        });
      } else {
        const task = tasks.find(t => t.id === taskIdNum);
        if (task) {
          dispatch(setCurrentTask(task));
        }
      }
    } else if (currentTask) {
      // 如果没有taskId参数但有当前任务，加载当前任务的步骤
      dispatch(fetchSteps(currentTask.id));
    }
  }, [taskId, stepId, dispatch, currentTask, tasks]);

  // 设置当前步骤
  useEffect(() => {
    if (steps.length > 0) {
      if (stepId) {
        // 如果有stepId参数，选中对应步骤
        const step = steps.find(s => s.id === parseInt(stepId));
        if (step) {
          setCurrentStep(step);
        }
      } else {
        // 否则选中第一个pending步骤
        const pendingStep = steps.find(s => s.status === 'pending');
        if (pendingStep) {
          setCurrentStep(pendingStep);
        } else if (steps.length > 0) {
          setCurrentStep(steps[0]);
        }
      }
    }
  }, [steps, stepId]);

  // 步骤状态映射
  const getStepStatus = (status: string) => {
    switch (status) {
      case 'completed': return 'finish';
      case 'failed': return 'error';
      case 'in_progress': return 'process';
      default: return 'wait';
    }
  };

  // 获取步骤类型标签
  const getStepTypeTag = (type: string) => {
    const typeMap: { [key: string]: { color: string; text: string } } = {
      'config': { color: 'blue', text: '配置' },
      'deploy': { color: 'green', text: '部署' },
      'verify': { color: 'orange', text: '验证' },
      'switch': { color: 'purple', text: '切换' },
      'rollback': { color: 'red', text: '回滚' }
    };
    const config = typeMap[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 操作步骤
  const handleStepAction = async (action: string, stepId: number) => {
    try {
      let updateData: any = {};
      
      switch (action) {
        case 'start':
          updateData = {
            status: 'in_progress',
            startTime: new Date().toISOString()
          };
          break;
        case 'complete':
          updateData = {
            status: 'completed',
            endTime: new Date().toISOString()
          };
          break;
        case 'fail':
          updateData = {
            status: 'failed',
            endTime: new Date().toISOString()
          };
          break;
        default:
          return;
      }

      await dispatch(updateStep({ id: stepId, data: updateData })).unwrap();
      message.success(`步骤${action === 'start' ? '开始' : action === 'complete' ? '完成' : '失败'}！`);
      
      // 重新加载步骤数据
      if (currentTask) {
        dispatch(fetchSteps(currentTask.id));
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 复制消息
  const handleCopyMessage = (step: TaskStep) => {
    const messageText = generateMessage(step);
    navigator.clipboard.writeText(messageText);
    message.success('消息已复制到剪贴板');
  };

  // 生成消息模板
  const generateMessage = (step: TaskStep) => {
    const taskName = currentTask?.name || '任务';
    const stepName = step.stepName || (step as any).step_name;
    const time = new Date().toLocaleString();
    
    switch (step.stepType || (step as any).step_type) {
      case 'deploy':
        return `【部署通知】\n任务：${taskName}\n步骤：${stepName}\n时间：${time}\n状态：准备开始\n请相关同事注意`;
      case 'switch':
        return `【切换通知】\n任务：${taskName}\n步骤：${stepName}\n时间：${time}\n请确认切换结果`;
      case 'verify':
        return `【验证通知】\n任务：${taskName}\n步骤：${stepName}\n时间：${time}\n请协助验证`;
      default:
        return `【流程通知】\n任务：${taskName}\n步骤：${stepName}\n时间：${time}`;
    }
  };

  // 如果没有当前任务且没有taskId参数
  if (!currentTask && !taskId) {
    return (
      <Card>
        <Alert
          message="请先选择一个任务"
          description="请从首页选择一个任务或创建新任务"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  // 计算进度
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div>
      {/* 任务信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2>{currentTask?.name || '任务流程'}</h2>
            <p style={{ color: '#666', margin: 0 }}>
              {currentTask?.description || ''}
            </p>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => currentTask && dispatch(fetchSteps(currentTask.id))}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
        
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={progress} 
            status={progress === 100 ? 'success' : 'active'}
            format={() => `${completedSteps}/${totalSteps} 完成`}
          />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 步骤列表 */}
        <Col xs={24} lg={12}>
          <Card title="流程步骤">
            <Steps
              current={currentStep ? currentStep.stepOrder || currentStep.step_order - 1 : 0}
              direction="vertical"
              size="small"
            >
              {steps.map((step, index) => (
                <Step
                  key={step.id}
                  title={
                    <div 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setCurrentStep(step)}
                    >
                      {step.stepName || step.step_name}
                    </div>
                  }
                  description={
                    <div>
                      {getStepTypeTag(step.stepType || step.step_type)}
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                        预计 {step.estimatedDuration || step.estimated_duration} 分钟
                      </span>
                    </div>
                  }
                  status={getStepStatus(step.status)}
                />
              ))}
            </Steps>
          </Card>
        </Col>

        {/* 当前步骤详情 */}
        <Col xs={24} lg={12}>
          <Card 
            title="步骤详情" 
            extra={
              currentStep && (
                <Space>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyMessage(currentStep)}
                  >
                    复制消息
                  </Button>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setIsModalVisible(true)}
                  >
                    编辑
                  </Button>
                </Space>
              )
            }
          >
            {currentStep ? (
              <div>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="步骤名称">
                    {currentStep.stepName || currentStep.step_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="步骤类型">
                    {getStepTypeTag(currentStep.stepType || currentStep.step_type)}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前状态">
                    <Tag color={
                      currentStep.status === 'completed' ? 'green' :
                      currentStep.status === 'failed' ? 'red' :
                      currentStep.status === 'in_progress' ? 'blue' : 'default'
                    }>
                      {currentStep.status === 'completed' ? '已完成' :
                       currentStep.status === 'failed' ? '失败' :
                       currentStep.status === 'in_progress' ? '进行中' : '等待中'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="预计时长">
                    {currentStep.estimatedDuration || currentStep.estimated_duration} 分钟
                  </Descriptions.Item>
                  {(currentStep.startTime || currentStep.start_time) && (
                    <Descriptions.Item label="开始时间">
                      {new Date(currentStep.startTime || currentStep.start_time).toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {(currentStep.endTime || currentStep.end_time) && (
                    <Descriptions.Item label="结束时间">
                      {new Date(currentStep.endTime || currentStep.end_time).toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {(currentStep.notes || currentStep.notes) && (
                    <Descriptions.Item label="备注">
                      {currentStep.notes}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                {/* 操作按钮 */}
                <div style={{ marginTop: 16 }}>
                  <Space>
                    {currentStep.status === 'pending' && (
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleStepAction('start', currentStep.id)}
                      >
                        开始执行
                      </Button>
                    )}
                    {currentStep.status === 'in_progress' && (
                      <>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleStepAction('complete', currentStep.id)}
                        >
                          标记完成
                        </Button>
                        <Button
                          danger
                          icon={<ExclamationCircleOutlined />}
                          onClick={() => handleStepAction('fail', currentStep.id)}
                        >
                          标记失败
                        </Button>
                      </>
                    )}
                  </Space>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingY: 20 }}>
                <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <p style={{ color: '#999', marginTop: 8 }}>请选择一个步骤</p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 编辑步骤模态框 */}
      <Modal
        title="编辑步骤"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            notes: currentStep?.notes || '',
            estimatedDuration: currentStep?.estimatedDuration || currentStep?.estimated_duration || 0
          }}
          onFinish={async (values) => {
            if (currentStep) {
              await handleStepAction('update', currentStep.id);
              setIsModalVisible(false);
            }
          }}
        >
          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          
          <Form.Item
            name="estimatedDuration"
            label="预计时长（分钟）"
          >
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskFlow; 