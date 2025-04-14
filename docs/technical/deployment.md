## 2. Scaling Configuration

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
```

### Resource Management
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ai-service-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

## 3. Service Mesh Configuration

### Istio Virtual Service
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ai-service-vs
spec:
  hosts:
  - ai-service
  http:
  - match:
    - uri:
        prefix: /api/v1/ai
    route:
    - destination:
        host: ai-service
        subset: v1
    retries:
      attempts: 3
      perTryTimeout: 2s
    timeout: 5s
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
```

## 4. Monitoring Setup

### Prometheus ServiceMonitor
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ai-service-monitor
spec:
  selector:
    matchLabels:
      app: ai-service
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "id": null,
    "title": "AI Service Dashboard",
    "tags": ["ai", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Model Inference Latency",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(ai_model_latency_bucket[5m])) by (le))",
            "legendFormat": "p95"
          }
        ]
      }
    ]
  }
}
```

## 5. CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: AI Service CI/CD
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Run AI model tests
      run: npm run test:ai

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - name: Build Docker image
      run: |
        docker build -t ai-service:${{ github.sha }} .
        docker tag ai-service:${{ github.sha }} ai-service:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        manifests: |
          k8s/deployment.yaml
          k8s/service.yaml
          k8s/hpa.yaml
```

## 6. Backup and Disaster Recovery

### Backup Configuration
```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: ai-service-backup
spec:
  schedule: "@daily"
  template:
    includedNamespaces:
    - ai-system
    includedResources:
    - deployments
    - services
    - configmaps
    - secrets
    labelSelector:
      matchLabels:
        app: ai-service
    storageLocation: default
    volumeSnapshotLocations:
    - default
``` 