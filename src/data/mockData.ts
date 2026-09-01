import { Project, Customer } from '../types/project'

export const customers: Customer[] = [
  {
    id: 'cust-acme-finance',
    name: 'Acme Finance Corp',
    contactName: 'John Shepherd',
    contactEmail: 'contact@acme-finance.example',
    contactPhone: '02-555-0100',
    industry: 'Finance',
    note: 'Acme Finance cloud migration project',
  },
  {
    id: 'cust-zeta-mfg',
    name: 'Zeta Manufacturing Ltd',
    contactName: 'Sarah Chen',
    contactEmail: 'ops@zeta-mfg.example',
    contactPhone: '02-555-0200',
    industry: 'Manufacturing',
    note: '[ZT-1042] Zeta Manufacturing Ltd',
  },
]

export const projects: Project[] = [
  {
    id: '1',
    projectName: 'Phase 2 Handover & Cutover',
    customer: 'Acme Finance Corp',
    customerId: 'cust-acme-finance',
    projectOwner: 'PM ผู้ดูแล',
    projectStatus: 'Active',
    assets: [
      { id: 'as-1-1', name: 'web-prod-01', destination: '0.0.0.0/0', role: 'Web', service: 'Web Portal (IIS)', license: 'Windows Server 2019 (BYOL)', source: 'VMware', os: 'Windows Server 2019', machineType: '4vCPU/16GB', vcpu: 4, ramGB: 16, storageType: 'SSD', osDiskGB: 120, dataDiskGB: 0, ipAddress: '10.10.1.11', subnetMask: '255.255.255.0', ipPublic: '203.0.113.11', domain: 'portal.acme-finance.example', ports: '80,443', allowedSource: '0.0.0.0/0 (CDN)', policies: [
        { port: '80', source: '0.0.0.0/0 (CDN)', destination: '10.10.1.11/32' },
        { port: '443', source: '0.0.0.0/0 (CDN)', destination: '10.10.1.11/32' },
        { port: '8080', source: '10.10.1.0/24', destination: '10.10.1.31/32' },
        { port: '3389', source: '10.99.0.0/24 (VPN)', destination: '10.10.1.11/32' },
      ], method: 'Hystax', status: 'Migrated' },
      { id: 'as-1-2', name: 'db-prod-01', destination: '10.10.1.0/24', role: 'Database', service: 'MySQL 8', license: '-', source: 'VMware', os: 'Ubuntu 20.04', machineType: '8vCPU/32GB', vcpu: 8, ramGB: 32, storageType: 'SSD', osDiskGB: 100, dataDiskGB: 400, ipAddress: '10.10.1.21', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '3306', allowedSource: '10.10.1.11/32', method: 'Hystax', status: 'Replicating' },
      { id: 'as-1-3', name: 'app-prod-01', destination: '10.10.1.0/24', role: 'App', service: 'API Service', license: '-', source: 'VMware', os: 'Windows Server 2022', machineType: '4vCPU/16GB', vcpu: 4, ramGB: 16, storageType: 'SSD', osDiskGB: 120, dataDiskGB: 80, ipAddress: '10.10.1.31', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '8080', allowedSource: '10.10.1.0/24', method: 'Rebuild', status: 'Pending' },
    ],
    services: [
      { id: 'sv-1-1', type: 'Load Balancer', name: 'lb-web', availabilityZone: 'Zone-A (Central)', topology: 'HA', spec: '2vCPU/4GB', ipPrivate: '10.10.1.5', algorithm: 'Round Robin', protocol: 'HTTPS', port: '443', members: '10.10.1.11, 10.10.1.12', ipPublic: '203.0.113.11', endpoint: 'lb-web.acme.nipa' },
      { id: 'sv-1-2', type: 'Database', name: 'db-mysql-prod', availabilityZone: 'Zone-A (Central)', engine: 'MySQL', version: '8.0', plan: '4vCPU/16GB', capacityGB: 200, ha: true, storageType: 'SSD', ipPrivate: '10.10.1.6', ipPublic: '', endpoint: 'db-mysql-prod.acme.nipa' },
      { id: 'sv-1-3', type: 'Object Storage', name: 'backup-store', bucket: 'acme-backup', storageClass: 'Standard', capacityGB: 2000, access: 'Private', endpoint: 'https://s3.nipa.cloud/acme-backup' },
    ],
    phases: [
      { id: '1-1', phaseNumber: 1, name: 'Preparation & Planning', mainActivity: 'Internal Kickoff', status: true,
        tasks: [ { id: '1-1-1', description: 'เก็บ Requirement ว่าแผนการ Migration ต้องทำ Migration Runbook', completed: true } ] },
      { id: '1-2', phaseNumber: 2, name: 'Internal Preparation', mainActivity: 'External Kickoff / Hystax Internal Implement', status: true,
        tasks: [ { id: '1-2-1', description: 'รีบ Requirement ครบทั้ง Hystax Controller', completed: true } ] },
      { id: '1-3', phaseNumber: 3, name: 'Customer Implementation', mainActivity: 'Hystax External Implement หรือ Create VM', status: true,
        tasks: [
          { id: '1-3-1', description: 'ติดตั้ง Hystax Agent', completed: true },
          { id: '1-3-2', description: 'ดำเนินการ Replication', completed: true },
          { id: '1-3-3', description: 'ตรวจสอบ Status Sync ข้อมูล', completed: true },
          { id: '1-3-4', description: 'ทำ Migrate Plan บน Hystax', completed: false },
        ] },
      { id: '1-4', phaseNumber: 4, name: 'Testing & Validation', mainActivity: 'Testing', status: true,
        tasks: [
          { id: '1-4-1', description: 'ตรวจสอบการใช้งาน', completed: true },
          { id: '1-4-2', description: 'จัดทำเอกสารการใช้งาน', completed: true },
        ] },
      { id: '1-5', phaseNumber: 5, name: 'Go-Live Execution', mainActivity: 'Cutover', status: false,
        tasks: [ { id: '1-5-1', description: 'ส่งมอบให้ลูกค้า', completed: false } ] },
      { id: '1-6', phaseNumber: 6, name: 'Operations Handover', mainActivity: 'Handover', status: false,
        tasks: [
          { id: '1-6-1', description: 'ส่งมอบเอกสารและ Diagram', completed: false },
          { id: '1-6-2', description: 'แจ้ง Access และ VPN', completed: false },
          { id: '1-6-3', description: 'ตัว อ. ให้ทีมต่อดำเนิน', completed: false },
        ] },
    ],
  },
  {
    id: '2',
    projectName: 'Zeta Cloud Migration',
    customer: 'Zeta Manufacturing Ltd',
    customerId: 'cust-zeta-mfg',
    projectOwner: 'PM ผู้ดูแล',
    projectStatus: 'Active',
    assets: [
      { id: 'as-2-1', name: 'web-prod-01', destination: '0.0.0.0/0', role: 'Web', service: 'Web App (Nginx)', license: 'Ubuntu', source: 'Hyper-V', os: 'Ubuntu 22.04', machineType: '4vCPU/8GB', vcpu: 4, ramGB: 8, storageType: 'SSD', osDiskGB: 60, dataDiskGB: 40, ipAddress: '10.20.1.10', subnetMask: '255.255.255.0', ipPublic: '203.0.113.20', domain: 'app.zeta-mfg.example', ports: '80,443', allowedSource: '0.0.0.0/0', method: 'Hystax', status: 'Testing' },
      { id: 'as-2-2', name: 'db-prod-01', destination: '10.20.1.0/24', role: 'Database', service: 'PostgreSQL 14', license: 'Ubuntu', source: 'Hyper-V', os: 'Ubuntu 22.04', machineType: '8vCPU/64GB', vcpu: 8, ramGB: 64, storageType: 'SSD', osDiskGB: 100, dataDiskGB: 900, ipAddress: '10.20.1.20', subnetMask: '255.255.255.0', ipPublic: '', domain: '', ports: '5432', allowedSource: '10.20.1.10/32', method: 'Hystax', status: 'Pending' },
    ],
    services: [
      { id: 'sv-2-1', type: 'Load Balancer', name: 'lb-web', availabilityZone: 'Zone-B (Regional)', topology: 'Standalone', spec: '2vCPU/4GB', ipPrivate: '10.20.1.5', algorithm: 'Least Connections', protocol: 'HTTPS', port: '443', members: '10.20.1.10', ipPublic: '203.0.113.20', endpoint: 'lb-web.zeta.nipa' },
      { id: 'sv-2-2', type: 'Database', name: 'db-pg-prod', availabilityZone: 'Zone-B (Regional)', engine: 'PostgreSQL', version: '14', plan: '8vCPU/64GB', capacityGB: 500, ha: true, storageType: 'SSD', ipPrivate: '10.20.1.6', ipPublic: '', endpoint: 'db-pg-prod.zeta.nipa' },
      { id: 'sv-2-3', type: 'Object Storage', name: 'app-data', bucket: 'zeta-data', storageClass: 'Standard', capacityGB: 1000, access: 'Public', endpoint: 'https://s3.nipa.cloud/zeta-data' },
    ],
    phases: [
      { id: '2-1', phaseNumber: 1, name: 'Preparation & Planning', mainActivity: 'Internal Kickoff', status: true,
        tasks: [ { id: '2-1-1', description: 'เก็บ Requirement ว่าแผนการ Migration ต้องทำ Migration Runbook', completed: true } ] },
      { id: '2-2', phaseNumber: 2, name: 'Internal Preparation', mainActivity: 'External Kickoff / Hystax Internal Implement', status: true,
        tasks: [ { id: '2-2-1', description: 'รีบ Requirement ครบทั้ง Hystax Controller', completed: true } ] },
      { id: '2-3', phaseNumber: 3, name: 'Customer Implementation', mainActivity: 'Hystax External Implement หรือ Create VM', status: true,
        tasks: [
          { id: '2-3-1', description: 'ติดตั้ง Hystax Agent', completed: true },
          { id: '2-3-2', description: 'ดำเนินการ Replication', completed: true },
          { id: '2-3-3', description: 'ตรวจสอบ Status Sync ข้อมูล', completed: true },
          { id: '2-3-4', description: 'ทำ Migrate Plan บน Hystax', completed: false },
        ] },
      { id: '2-4', phaseNumber: 4, name: 'Testing & Validation', mainActivity: 'Testing', status: true,
        tasks: [
          { id: '2-4-1', description: 'ตรวจสอบการใช้งาน', completed: true },
          { id: '2-4-2', description: 'จัดทำเอกสารการใช้งาน', completed: true },
        ] },
      { id: '2-5', phaseNumber: 5, name: 'Go-Live Execution', mainActivity: 'Cutover', status: false,
        tasks: [ { id: '2-5-1', description: 'ส่งมอบให้ลูกค้า', completed: false } ] },
      { id: '2-6', phaseNumber: 6, name: 'Operations Handover', mainActivity: 'Handover', status: false,
        tasks: [
          { id: '2-6-1', description: 'ส่งมอบเอกสารและ Diagram', completed: false },
          { id: '2-6-2', description: 'แจ้ง Access และ VPN', completed: false },
          { id: '2-6-3', description: 'ตัว อ. ให้ทีมต่อดำเนิน', completed: false },
        ] },
    ],
  },
]
