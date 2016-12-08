'use strict';

const path = require('path');
const ZwaveDriver = require('homey-zwavedriver');

module.exports = new ZwaveDriver(path.basename(__dirname), {
	debug: true,
	capabilities: {

		onoff: {
			command_class: 'COMMAND_CLASS_SWITCH_BINARY',
			command_get: 'SWITCH_BINARY_GET',
			command_set: 'SWITCH_BINARY_SET',
			command_set_parser: value => {
				return {
					'Switch Value': (value > 0) ? 'on/enable' : 'off/disable',
				};
			},
			command_report: 'SWITCH_BINARY_REPORT',
			command_report_parser: report => report['Value'] === 'on/enable',
		},

		measure_temperature: {
			command_class: 'COMMAND_CLASS_SENSOR_MULTILEVEL',
			command_get: 'SENSOR_MULTILEVEL_GET',
			command_get_parser: () => ({
				'Sensor Type': 'Temperature (version 1)',
				Properties1: {
					Scale: 0,
				},
			}),
			command_report: 'SENSOR_MULTILEVEL_REPORT',
			command_report_parser: report => report['Sensor Value (Parsed)'],
			optional: true,
		},

		measure_power: {
			command_class: 'COMMAND_CLASS_METER',
			command_get: 'METER_GET',
			command_get_parser: () => ({
				Properties1: {
					Scale: 7,
				},
			}),
			command_report: 'METER_REPORT',
			command_report_parser: report => {
				if (report.hasOwnProperty('Properties2')
					&& report.Properties2.hasOwnProperty('Scale bits 10')
					&& report.Properties2['Scale bits 10'] === 2) {
					return report['Meter Value (Parsed)'];
				}
				return null;
			},
		},

		meter_power: {
			command_class: 'COMMAND_CLASS_METER',
			command_get: 'METER_GET',
			command_get_parser: () => ({
				Properties1: {
					Scale: 0,
				},
			}),
			command_report: 'METER_REPORT',
			command_report_parser: report => {
				if (report.hasOwnProperty('Properties2')
					&& report.Properties2.hasOwnProperty('Scale bits 10')
					&& report.Properties2['Scale bits 10'] === 0) {
					return report['Meter Value (Parsed)'];
				}
				return null;
			},
		},
	},

	settings: {
		input_1_type: {
			index: 1,
			size: 1,
		},
		input_2_type: {
			index: 2,
			size: 1,
		},
		deactivate_ALL_ON_ALL_OFF: {
			index: 10,
			size: 2,
		},
		automatic_turning_off_output_q1_after_set_time: {
			index: 11,
			size: 2,
		},
		automatic_turning_off_output_q2_after_set_time: {
			index: 12,
			size: 2,
		},
		state_of_device_after_power_failure: {
			index: 30,
			size: 1,
			parser: input => new Buffer([(input === true) ? 1 : 0]),
		},
		power_report_on_power_change_q1: {
			index: 40,
			size: 1,
		},
		power_report_on_power_change_q2: {
			index: 41,
			size: 1,
		},
		power_report_by_time_interval_q1: {
			index: 42,
			size: 2,
		},
		power_report_by_time_interval_q2: {
			index: 43,
			size: 2,
		},
	},
});

module.exports.on('initNode', token => {
	const node = module.exports.nodes[token];

	if (node) {
		if (node.instance.CommandClass.COMMAND_CLASS_SENSOR_MULTILEVEL) {
			node.instance.CommandClass.COMMAND_CLASS_SENSOR_MULTILEVEL.on('report', (command, report) => {
				if (command.name === 'SENSOR_MULTILEVEL_REPORT') {
					Homey.manager('flow').triggerDevice(
						'ZMNHBA2_temp_changed',
						{ ZMNHBA2_temp: report['Sensor Value (Parsed)'] },
						report['Sensor Value (Parsed)'], node.device_data
					);
				}
			});
		}
	}
});

Homey.manager('flow').on('trigger.ZMNHBAD2_temp_changed', callback => callback(null, true));
