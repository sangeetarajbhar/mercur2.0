import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { sendSQSMessage } from '../shared/utils/sqs'

export default async function videoEncodingJobSubscriber({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const encodingJobId = event.data.id
  const logger = container.resolve("logger")
  logger.info(`Received event: ${event.name}, encodingJobId: ${encodingJobId}`)

  const messageBody = {
    operation: 'createVideoEncodingJob',
    videoEncodingEvent: 'create',
    encodingJobId: encodingJobId,
    eventTimestamp: new Date()
  }

  await sendSQSMessage({
    message: {
      body: messageBody
    },
    queueUrl: process.env.AWS_VIDEO_ENCODING_JOB_QUEUE_URL
  })
}

export const config: SubscriberConfig = {
  event: 'video_encoding_jobs_created',
  context: {
    subscriberId: 'video-encoding-jobs-created-send-to-sqs'
  }
}

