
describe('HealthAssist Pro E2E Flow', () => {
  it('Registers, logs in, adds a patient, runs diagnosis, exports treatment, and submits feedback', () => {
    cy.visit('/register');
    cy.get('[name="email"]').type('doctor@example.com');
    cy.get('[name="password"]').type('SecurePass123!');
    cy.get('[name="role"]').select('Doctor');
    cy.get('form').submit();

    cy.visit('/login');
    cy.get('[name="email"]').type('doctor@example.com');
    cy.get('[name="password"]').type('SecurePass123!');
    cy.get('form').submit();

    cy.contains('Add Patient').click();
    cy.get('[name="name"]').type('John Doe');
    cy.get('[name="age"]').type('45');
    cy.get('[name="gender"]').select('Male');
    cy.get('[name="symptoms"]').type('Fever{enter}');
    cy.get('form').submit();

    cy.contains('Run Diagnosis').click();
    cy.get('[name="vitals.temperature"]').type('101.5');
    cy.get('[name="vitals.heartRate"]').type('88');
    cy.get('form').submit();

    cy.contains('Export PDF').click();
    cy.contains('Submit Feedback').click();
    cy.get('[name="rating"]').select('5');
    cy.get('[name="comments"]').type('Very helpful!');
    cy.get('form').submit();
  });
});
