import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, 
  Steps, 
  Button, 
  Progress, 
  Tag, 
  Row, 
  Col, 
  Space, 
  Descriptions,
  Alert,
  message,
  Modal,
  Input,
  Form,
  Badge,
  Tabs,
  List,
  Typography
} from 'antd';
import { 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EditOutlined,
  ReloadOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSteps, updateStep } from '../store/slices/stepSlice';
import { fetchTasks, setCurrentTask } from '../store/slices/taskSlice';
import { TaskStep, StepStatus } from '../types';

const { Step } = Steps;
const { TextArea } = Input;
const { Link } = Typography;

const TaskFlow: React.FC = () => {
  const dispatch = useAppDispatch();
  const { taskId, stepId } = useParams<{ taskId: string; stepId: string }>();
  const { steps } = useAppSelector(state => state.step);
  const { tasks, currentTask } = useAppSelector(state => state.task);
  
  const [currentStep, setCurrentStep] = useState<TaskStep | null>(null);
  const [activeFlowType, setActiveFlowType] = useState<string>('');
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

  // 设置当前步骤和对应的流程类型tab
  useEffect(() => {
    if (steps.length > 0) {
      if (stepId) {
        // 如果有stepId参数，选中对应步骤
        const step = steps.find(s => s.id === parseInt(stepId));
        if (step) {
          setCurrentStep(step);
          // 自动选择对应的流程类型tab
          const flowType = step.notes || (step as any).notes || 'unknown';
          setActiveFlowType(flowType);
        }
      } else if (!currentStep) {
        // 只有在没有当前步骤时才自动选择，避免用户操作后被强制跳转
        const pendingStep = steps.find(s => s.status === 'pending');
        if (pendingStep) {
          setCurrentStep(pendingStep);
          const flowType = pendingStep.notes || (pendingStep as any).notes || 'unknown';
          setActiveFlowType(flowType);
        } else if (steps.length > 0) {
          setCurrentStep(steps[0]);
          const flowType = steps[0].notes || (steps[0] as any).notes || 'unknown';
          setActiveFlowType(flowType);
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

  // 检查步骤是否可以执行（依赖检查）
  const canExecuteStep = (step: TaskStep): boolean => {
    // 已完成或已失败的步骤不可执行
    if (step.status === 'completed' || step.status === 'failed') {
      return false;
    }
    
    // 进行中的步骤可以执行（显示完成/失败按钮）
    if (step.status === 'in_progress') {
      return true;
    }
    
    // pending状态的步骤需要检查依赖
    if (step.status === 'pending') {
      // 解析依赖关系
      let dependencies: number[] = [];
      try {
        const deps = step.dependencies || (step as any).dependencies || '[]';
        dependencies = JSON.parse(deps);
      } catch (e) {
        dependencies = [];
      }
      
      // 检查所有依赖步骤是否已完成
      for (const depOrder of dependencies) {
        const depStep = steps.find((s: any) => (s.stepOrder || s.step_order) === depOrder);
        if (!depStep || depStep.status !== 'completed') {
          return false; // 依赖步骤未完成
        }
      }
      
      return true;
    }
    
    return false;
  };

  // 获取步骤不可执行的原因
  const getStepBlockReason = (step: TaskStep): string | null => {
    if (step.status !== 'pending') {
      return null;
    }
    
    let dependencies: number[] = [];
    try {
      const deps = step.dependencies || (step as any).dependencies || '[]';
      dependencies = JSON.parse(deps);
    } catch (e) {
      dependencies = [];
    }
    
    for (const depOrder of dependencies) {
      const depStep = steps.find((s: any) => (s.stepOrder || s.step_order) === depOrder);
      if (!depStep || depStep.status !== 'completed') {
        const depStepName = depStep ? depStep.stepName : `步骤${depOrder}`;
        return `需要先完成：${depStepName}`;
      }
    }
    
    return null;
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
        case 'oneClickComplete':
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

      // 1. 先更新服务器
      await dispatch(updateStep({ id: stepId, data: updateData })).unwrap();
      message.success(`步骤${action === 'start' ? '开始' : (action === 'complete' || action === 'oneClickComplete') ? '完成' : '失败'}！`);
      
      // 2. 总是重新加载服务器最新数据，确保状态同步
      if (currentTask) {
        const result = await dispatch(fetchSteps(currentTask.id));
        const updatedSteps = (result.payload as any)?.data || result.payload;
        
        if (updatedSteps && Array.isArray(updatedSteps)) {
          // 根据操作类型决定是否跳转
          if (action === 'start' || action === 'fail') {
            // 开始和失败操作：更新当前步骤状态但不跳转
            const updatedCurrentStep = updatedSteps.find((s: any) => s.id === stepId);
            if (updatedCurrentStep) {
              setCurrentStep(updatedCurrentStep);
            }
          } else if (action === 'complete' || action === 'oneClickComplete') {
            // 完成操作：尝试跳转到同一流程类型的下一个可执行步骤
            const currentFlowType = currentStep?.notes || (currentStep as any)?.notes;
            
            // 修复：只在同流程类型内查找下一个可执行步骤
            const sameFlowSteps = updatedSteps.filter((s: any) => s.notes === currentFlowType);
            
            // 按step_order排序，找到下一个可执行步骤
            sameFlowSteps.sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0));
            const nextStepInSameFlow = sameFlowSteps.find((s: any) => s.status === 'pending' && canExecuteStepWithSteps(s, updatedSteps));
            
            if (nextStepInSameFlow) {
              // 跳转到同流程的下一个可执行步骤，确保tab不变
              setCurrentStep(nextStepInSameFlow);
              // 不要改变activeFlowType，保持在当前tab
            } else {
              // 如果同流程没有可执行步骤，更新当前步骤状态但不跳转
              const updatedCurrentStep = updatedSteps.find((s: any) => s.id === stepId);
              if (updatedCurrentStep) {
                setCurrentStep(updatedCurrentStep);
              }
            }
          }
        }
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 辅助函数：用指定的steps数组检查步骤是否可执行
  const canExecuteStepWithSteps = (step: TaskStep, stepsArray: TaskStep[]): boolean => {
    if (step.status !== 'pending') {
      return false;
    }
    
    let dependencies: number[] = [];
    try {
      const deps = step.dependencies || (step as any).dependencies || '[]';
      dependencies = JSON.parse(deps);
    } catch (e) {
      dependencies = [];
    }
    
    for (const depOrder of dependencies) {
      const depStep = stepsArray.find((s: any) => (s.stepOrder || s.step_order) === depOrder);
      if (!depStep || depStep.status !== 'completed') {
        return false;
      }
    }
    
    return true;
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
    const time = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
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

  // 流程类型标签映射
  const getFlowTypeInfo = (flowType: string) => {
    const flowTypeMap: { [key: string]: { label: string; color: string; icon: string } } = {
      'domestic_non_core': { label: '国内非核心', color: '#1890ff', icon: '🏠' },
      'international_non_core': { label: '国际非核心', color: '#52c41a', icon: '🌍' },
      'international_crawler': { label: '国际爬虫', color: '#fa8c16', icon: '🕷️' }
    };
    return flowTypeMap[flowType] || { label: flowType, color: '#666', icon: '📋' };
  };

  // 按流程类型分组步骤
  const groupStepsByFlowType = () => {
    const groups: { [key: string]: TaskStep[] } = {};
    
    steps.forEach(step => {
      const flowType = step.notes || (step as any).notes || 'unknown';
      if (!groups[flowType]) {
        groups[flowType] = [];
      }
      groups[flowType].push(step);
    });

    // 按step_order排序每个分组内的步骤
    Object.keys(groups).forEach(flowType => {
      groups[flowType].sort((a, b) => {
        const orderA = a.stepOrder || (a as any).step_order || 0;
        const orderB = b.stepOrder || (b as any).step_order || 0;
        return orderA - orderB;
      });
    });

    return groups;
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

      {/* 新的左右分栏Tab布局 */}
      <Card>
        <Row gutter={16} style={{ minHeight: '600px' }}>
          {/* 左侧流程类型Tab */}
          <Col xs={24} lg={10}>
            <Tabs
              tabPosition="left"
              size="large"
              style={{ height: '100%' }}
              activeKey={activeFlowType}
              onChange={(key) => {
                setActiveFlowType(key);
                // 切换tab时，自动选择该流程类型下的第一个可执行步骤
                const groupedSteps = groupStepsByFlowType();
                const targetFlowSteps = groupedSteps[key] || [];
                
                if (targetFlowSteps.length > 0) {
                  // 优先选择第一个可执行的步骤
                  const executableStep = targetFlowSteps.find(step => canExecuteStep(step));
                  if (executableStep) {
                    setCurrentStep(executableStep);
                  } else {
                    // 如果没有可执行步骤，选择第一个步骤
                    setCurrentStep(targetFlowSteps[0]);
                  }
                }
              }}
              items={Object.entries(groupStepsByFlowType()).map(([flowType, flowSteps]) => {
                const flowInfo = getFlowTypeInfo(flowType);
                const completedCount = flowSteps.filter(s => s.status === 'completed').length;
                const allCompleted = completedCount === flowSteps.length;
                
                return {
                  key: flowType,
                  label: (
                    <div style={{ 
                      padding: '8px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      minWidth: 80
                    }}>
                      <div style={{ 
                        fontSize: 18,
                        color: flowInfo.color
                      }}>
                        {flowInfo.icon}
                      </div>
                      <div style={{ 
                        fontSize: 12,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        lineHeight: 1.2
                      }}>
                        {flowInfo.label}
                      </div>
                      <Badge 
                        count={`${completedCount}/${flowSteps.length}`}
                        style={{ 
                          backgroundColor: allCompleted ? '#52c41a' : '#1890ff',
                          fontSize: 10
                        }}
                      />
                    </div>
                  ),
                  children: (
                    <div style={{ padding: '0 16px' }}>
                      <Steps
                        direction="vertical"
                        size="small"
                      >
                        {flowSteps.map((step) => (
                          <Step
                            key={step.id}
                            title={
                              <div 
                                style={{ 
                                  cursor: 'pointer',
                                  fontWeight: currentStep?.id === step.id ? 'bold' : 'normal',
                                  color: currentStep?.id === step.id ? '#1890ff' : 'inherit'
                                }}
                                onClick={() => {
                                  setCurrentStep(step);
                                  // 自动切换到对应的流程类型tab
                                  const flowType = step.notes || (step as any).notes || 'unknown';
                                  setActiveFlowType(flowType);
                                }}
                              >
                                {step.stepName || (step as any).step_name}
                              </div>
                            }
                            description={
                              <div>
                                {getStepTypeTag(step.stepType || (step as any).step_type)}
                                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                                  预计 {step.estimatedDuration || (step as any).estimated_duration} 分钟
                                </span>
                              </div>
                            }
                            status={getStepStatus(step.status)}
                          />
                        ))}
                      </Steps>
                    </div>
                  )
                };
              })}
            />
          </Col>

          {/* 右侧步骤详情 */}
          <Col xs={24} lg={14}>
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
                      {currentStep.stepName || (currentStep as any).step_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="步骤类型">
                      {getStepTypeTag(currentStep.stepType || (currentStep as any).step_type)}
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
                      {currentStep.estimatedDuration || (currentStep as any).estimated_duration} 分钟
                    </Descriptions.Item>
                    {(currentStep.startTime || (currentStep as any).start_time) && (
                      <Descriptions.Item label="开始时间">
                        {new Date(currentStep.startTime || (currentStep as any).start_time).toLocaleString('zh-CN', {
                          timeZone: 'Asia/Shanghai',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </Descriptions.Item>
                    )}
                    {(currentStep.endTime || (currentStep as any).end_time) && (
                      <Descriptions.Item label="结束时间">
                        {new Date(currentStep.endTime || (currentStep as any).end_time).toLocaleString('zh-CN', {
                          timeZone: 'Asia/Shanghai',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </Descriptions.Item>
                    )}
                    {currentStep.notes && (
                      <Descriptions.Item label="备注">
                        {currentStep.notes}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* 链接列表 */}
                  {(() => {
                    try {
                      const links = currentStep.links ? JSON.parse(currentStep.links) : [];
                      if (links.length > 0) {
                        return (
                          <div style={{ marginTop: 16 }}>
                            <h4 style={{ marginBottom: 8, fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                              <LinkOutlined style={{ marginRight: 4 }} />
                              相关链接
                            </h4>
                            <List
                              size="small"
                              dataSource={links}
                              renderItem={(link: { name: string; url: string }) => (
                                <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                  <Link
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '13px' }}
                                  >
                                    <LinkOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                                    {link.name}
                                  </Link>
                                </List.Item>
                              )}
                              style={{ 
                                backgroundColor: '#f9f9f9', 
                                padding: '8px 12px', 
                                borderRadius: '4px',
                                border: '1px solid #e8e8e8'
                              }}
                            />
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error('解析链接数据失败:', e);
                    }
                    return null;
                  })()}

                  {/* 操作按钮 */}
                  <div style={{ marginTop: 16 }}>
                    <Space>
                      {currentStep.status === 'completed' ? (
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                          disabled
                        >
                          已完成
                        </Button>
                      ) : currentStep.status === 'failed' ? (
                        <Button
                          danger
                          icon={<ExclamationCircleOutlined />}
                          disabled
                        >
                          已失败
                        </Button>
                      ) : canExecuteStep(currentStep) ? (
                        <>
                          {currentStep.status === 'pending' && (
                            <>
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleStepAction('start', currentStep.id)}
                              >
                                开始执行
                              </Button>
                              <Button
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleStepAction('oneClickComplete', currentStep.id)}
                              >
                                一键完成
                              </Button>
                            </>
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
                        </>
                      ) : (
                        <Button
                          type="primary"
                          icon={<ExclamationCircleOutlined />}
                          onClick={() => {
                            const reason = getStepBlockReason(currentStep);
                            if (reason) {
                              message.error(reason);
                            }
                          }}
                        >
                          无法执行
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <ClockCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p style={{ color: '#999', marginTop: 8 }}>请选择一个步骤</p>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

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
            estimatedDuration: currentStep?.estimatedDuration || 0,
            links: (() => {
              try {
                const links = currentStep?.links ? JSON.parse(currentStep.links) : [];
                return links.map((link: any) => `${link.name}|${link.url}`).join('\n');
              } catch (e) {
                return '';
              }
            })()
          }}
          onFinish={async (values) => {
            if (currentStep) {
              // 解析链接数据
              let linksData = [];
              if (values.links && values.links.trim()) {
                try {
                  linksData = values.links.split('\n')
                    .filter((line: string) => line.trim())
                    .map((line: string) => {
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
                  message.error('链接格式错误，请使用：名称|网址 的格式，每行一个');
                  return;
                }
              }
              
                             await dispatch(updateStep({
                 id: currentStep.id,
                 data: {
                   notes: values.notes,
                   estimatedDuration: values.estimatedDuration,
                   links: JSON.stringify(linksData)
                 }
               }));
              
              message.success('步骤更新成功');
              setIsModalVisible(false);
              form.resetFields();
              
              // 重新加载步骤数据
              if (currentTask) {
                dispatch(fetchSteps(currentTask.id));
              }
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

          <Form.Item
            name="links"
            label="相关链接"
            help="每行一个链接，格式：链接名称|链接地址，例如：监控链接|https://example.com"
          >
            <TextArea 
              rows={4} 
              placeholder="链接名称|链接地址&#10;例如：&#10;监控系统|https://monitor.example.com&#10;操作手册|https://docs.example.com" 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskFlow; 