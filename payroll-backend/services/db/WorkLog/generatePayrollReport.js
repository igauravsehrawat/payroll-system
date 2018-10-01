const moment = require('moment');
const WorkLog = require('../../../models/WorkLog');
const JobGroupRate = require('../../../models/JobGroupRate');

const jobGroupRatesMap = async () => {
  const allRates = await JobGroupRate.find({}).lean().exec();
  const jobGroupRates = {};
  allRates.forEach((rate) => {
    jobGroupRates[rate.jobGroup] = rate.perHourRate;
  });
  return jobGroupRates;
};

const isDateLessOrEqualTo15th = (date) => {
  const month = moment(date).get('month');
  const year = moment(date).get('year');
  const date15th = moment().set({ date: 15, month, year });
  if (date <= date15th) {
    return true;
  }
  return false;
};

const generateNthOfMonth = (date, n) => {
  const momentDate = moment(date);
  const month = momentDate.get('month');
  const year = momentDate.get('year');
  const dateNth = moment().set({
    date: n,
    month,
    year,
  });
  return dateNth;
};

let payrollRow = {
  employeeId: null,
  payPeriod: null,
  amountPaid: null,
};

const setPayrollRow = (employeeId, payPeriod, amountPaid) => {
  payrollRow = {
    employeeId,
    payPeriod,
    amountPaid,
  };
};


const generatePayPeriod = (date) => {
  if (isDateLessOrEqualTo15th(date)) {
    return `${generateNthOfMonth(date, 1)}-${generateNthOfMonth(date, 15)}`;
  }
  return `${generateNthOfMonth(date, 16)}-${generateNthOfMonth(date, 30)}`;
};

const generatePayrollReport = async () => {
  const sortQuery = {
    employeeId: 1,
    date: 1,
  };
  const allWorkLogs = await WorkLog.find({ reportId: 46 }).sort(sortQuery).lean().exec();
  const jobGroupRates = await jobGroupRatesMap();

  const payrollReport = [];
  for (let index = 0, workLogLength = allWorkLogs.length; index < workLogLength; index += 1) {
    const workLog = allWorkLogs[index];
    const {
      date, employeeId, hoursWorked, jobGroup,
    } = workLog;
    const payPeriod = generatePayPeriod(date);
    // nothing is set initally
    if (!payrollRow.employeeId && !payrollReport.payPeriod) {
      setPayrollRow(employeeId, payPeriod, 0);
    } else if (payrollRow.employeeId !== employeeId || payrollRow.payPeriod !== payPeriod) {
      // check if there is change, push the existing and set the new
      payrollReport.push(payrollRow);
      setPayrollRow(employeeId, payPeriod, 0);
    } else if (payrollRow.employeeId === employeeId && payrollRow.payPeriod === payPeriod) {
      // check if it is same
      payrollReport.amountPaid += hoursWorked * jobGroupRates[jobGroup];
    }
  }
  payrollReport.push(payrollRow);
  return payrollReport;
};

module.exports = generatePayrollReport;
