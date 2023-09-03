import { expect, jest, test } from '@jest/globals';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MyWidgetService from '../lib/my_widget_service-stack';

test('Lambda Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new MyWidgetService.MyWidgetServiceStack(app, 'MyTestStack');
    // THEN
  const template = Template.fromStack(stack);

  console.log(JSON.stringify(template.toJSON(), null, 2));

  // lambda function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs18.x',
  });

  // bucket
  template.hasResource('AWS::S3::Bucket', {
    UpdateReplacePolicy: "Retain",
    DeletionPolicy: "Retain"
  });

  // api gateway
  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: "Widget Service"
  });
});
