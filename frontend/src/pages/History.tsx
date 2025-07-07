import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Typography, 
  Descriptions,
  message,
  Pagination,
  Popconfirm
} from 'antd';
import { EyeOutlined, DownloadOutlined, StopOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchHistory, fetchHistoryDetail, exportHistory } from '../store/slices/historySlice';

const { Title, Text } = Typography;

const History: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const { records, currentRecord, pagination, loading } = useSelector((state: RootState) => state.history);

  useEffect(() => {
    dispatch(fetchHistory({ page: 1, pageSize: 10 }));
  }, [dispatch]);

  const handleViewDetail = async (record: any) => {
    try {
      await dispatch(fetchHistoryDetail(record.task.id)).unwrap();
      setIsDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '获取详情失败');
    }
  };

  const handleExport = async (taskId: number) => {
    try {
      await dispatch(exportHistory(taskId)).unwrap();
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    }
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    dispatch(fetchHistory({ page, pageSize: pageSize || 10 }));
  };

  const handleForceComplete = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        message.success('任务已强制结束');
        // 重新加载历史记录
        dispatch(fetchHistory({ page: pagination.current, pageSize: pagination.pageSize }));
      } else {
        message.error(data.message || '结束失败');
      }
    } catch (error) {
      message.error('结束失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in_progress':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'in_progress':
        return '进行中';
      case 'paused':
        return '暂停';
      default:
        return '草稿';
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: ['task', 'name'],
      key: 'name',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: ['task', 'status'],
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '总步骤',
      dataIndex: ['statistics', 'totalSteps'],
      key: 'totalSteps',
    },
    {
      title: '已完成',
      dataIndex: ['statistics', 'completedSteps'],
      key: 'completedSteps',
    },
    {
      title: '失败',
      dataIndex: ['statistics', 'failedSteps'],
      key: 'failedSteps',
    },
    {
      title: '总耗时(分钟)',
      dataIndex: ['statistics', 'totalDuration'],
      key: 'totalDuration',
    },
    {
      title: '创建时间',
      dataIndex: ['task', 'createdTime'],
      key: 'createdTime',
      render: (time: string) => new Date(time).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record.task.id)}
          >
            导出
          </Button>
          {record.task.status === 'in_progress' && (
            <Popconfirm
              title="强制结束任务"
              description="确定要强制结束此任务吗？这将直接完成任务，无法撤销。"
              onConfirm={() => handleForceComplete(record.task.id)}
              okText="确定结束"
              cancelText="取消"
              okType="danger"
            >
              <Button 
                size="small" 
                danger 
                icon={<StopOutlined />}
              >
                强制结束
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="历史记录">
        <Table
          columns={columns}
          dataSource={records}
          rowKey={record => record.task.id}
          loading={loading}
          pagination={false}
        />
        
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
            }
          />
        </div>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="任务详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="export" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => currentRecord && handleExport(currentRecord.task.id)}
          >
            导出数据
          </Button>
        ]}
        width={800}
      >
        {currentRecord && (
          <div>
            <Descriptions title="基本信息" bordered column={2}>
              <Descriptions.Item label="任务名称">
                {currentRecord.task.name}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(currentRecord.task.status)}>
                  {getStatusText(currentRecord.task.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(currentRecord.task.createdTime).toLocaleString('zh-CN', {
                  timeZone: 'Asia/Shanghai',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {currentRecord.task.endTime 
                  ? new Date(currentRecord.task.endTime).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : '未完成'
                }
              </Descriptions.Item>
              <Descriptions.Item label="任务描述" span={2}>
                {currentRecord.task.description || '无描述'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Title level={4}>步骤详情</Title>
              <Table
                columns={[
                  {
                    title: '步骤',
                    dataIndex: 'stepOrder',
                    key: 'stepOrder',
                    width: 60,
                  },
                  {
                    title: '步骤名称',
                    dataIndex: 'stepName',
                    key: 'stepName',
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={getStatusColor(status)}>
                        {getStatusText(status)}
                      </Tag>
                    ),
                  },
                  {
                    title: '开始时间',
                    dataIndex: 'startTime',
                    key: 'startTime',
                    width: 140,
                    render: (time: string) => time ? new Date(time).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-',
                  },
                  {
                    title: '完成时间',
                    dataIndex: 'endTime',
                    key: 'endTime',
                    width: 140,
                    render: (time: string) => time ? new Date(time).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-',
                  },
                  {
                    title: '耗时(分钟)',
                    dataIndex: 'actualDuration',
                    key: 'actualDuration',
                    width: 80,
                    render: (duration: number) => duration || '-',
                  },
                  {
                    title: '备注',
                    dataIndex: 'notes',
                    key: 'notes',
                    ellipsis: true,
                    render: (notes: string) => notes || '-',
                  },
                ]}
                dataSource={currentRecord.steps}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Title level={4}>统计信息</Title>
              <Descriptions column={4}>
                <Descriptions.Item label="总步骤">
                  {currentRecord.statistics.totalSteps}
                </Descriptions.Item>
                <Descriptions.Item label="已完成">
                  <Text type="success">{currentRecord.statistics.completedSteps}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="失败">
                  <Text type="danger">{currentRecord.statistics.failedSteps}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="总耗时">
                  {currentRecord.statistics.totalDuration} 分钟
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default History; 