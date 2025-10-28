const useAws = !!process.env.AWS_REGION && !!process.env.AWS_S3_BUCKET_NAME;

module.exports = useAws ? require('./aws') : require('./memory');
